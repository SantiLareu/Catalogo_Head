import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  CATALOG_POLL_INTERVAL_MS,
  createPublishedCatalogClient,
  getPublishedCatalogUrl,
  getPublishedCatalogVersionUrl,
  isValidCatalogVersion,
  isValidPublishedCatalog,
  shouldApplyCatalogResponse
} from '../../src/services/publishedCatalog.js';
import {
  CART_STORAGE_KEY,
  readCart,
  writeCart
} from '../../src/services/cartStorage.js';

const product = ({ id = 'shoe', price = 100 } = {}) => ({
  id,
  name: 'Zapatilla',
  price,
  sizes: [],
  variants: []
});
const catalog = (products = [product()]) => ({ categories: [], products });
const bytesFor = (value) => new TextEncoder().encode(
  typeof value === 'string' ? value : JSON.stringify(value)
);
const versionForBytes = (bytes) => 'sha256-' + createHash('sha256')
  .update(bytes)
  .digest('hex');
const versionFor = (value) => versionForBytes(bytesFor(value));
const manifestFor = (value) => ({
  schemaVersion: 1,
  version: versionFor(value),
  catalogFile: 'catalog.json'
});
const jsonResponse = (body, options = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  json: options.json ?? (async () => body)
});
const catalogResponse = (value, options = {}) => {
  const bytes = bytesFor(value);
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    arrayBuffer: options.arrayBuffer ?? (async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
    )
  };
};

function createClient({ initial = catalog(), fetchImpl, minIntervalMs = 60_000, now } = {}) {
  return createPublishedCatalogClient({
    initialCatalog: initial,
    initialVersion: versionFor(initial),
    fetchImpl,
    cryptoImpl: webcrypto,
    minIntervalMs,
    now,
    catalogUrl: '/catalog.json',
    versionUrl: '/catalog-version.json'
  });
}

test('construye URLs relativas a la base de publicación', () => {
  assert.equal(
    getPublishedCatalogUrl('https://example.test/catalogo/'),
    'https://example.test/catalogo/catalog.json'
  );
  assert.equal(
    getPublishedCatalogVersionUrl('https://example.test/catalogo/'),
    'https://example.test/catalogo/catalog-version.json'
  );
});

test('misma versión consulta solo el manifest y no descarga catalog.json', async () => {
  const initial = catalog();
  const calls = [];
  const client = createClient({
    initial,
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return jsonResponse(manifestFor(initial));
    }
  });

  const result = await client.check();

  assert.equal(result.status, 'current');
  assert.equal(result.changed, false);
  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /^\/catalog-version\.json\?check=/);
  assert.deepEqual(calls[0][1], { cache: 'no-store' });
});

test('versión nueva descarga por hash, verifica SHA y actualiza el par atómicamente', async () => {
  const initial = catalog();
  const next = catalog([product({ price: 120 })]);
  const nextManifest = manifestFor(next);
  const calls = [];
  const client = createClient({
    initial,
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return calls.length === 1
        ? jsonResponse(nextManifest)
        : catalogResponse(next);
    }
  });

  const result = await client.check();

  assert.equal(result.status, 'changes_detected');
  assert.equal(result.catalog.products[0].price, 120);
  assert.equal(result.version, nextManifest.version);
  assert.deepEqual(client.getActiveState(), {
    catalog: result.catalog,
    version: result.version
  });
  assert.match(calls[1][0], /\/catalog\.json\?v=sha256-[a-f0-9]{64}$/);
  assert.deepEqual(calls[1][1], { cache: 'no-store' });
});

test('SHA incorrecto rechaza la actualización y conserva estado anterior', async () => {
  const initial = catalog();
  const advertised = catalog([product({ price: 120 })]);
  const delivered = catalog([product({ price: 130 })]);
  const client = createClient({
    initial,
    fetchImpl: async (url) => url.startsWith('/catalog-version')
      ? jsonResponse(manifestFor(advertised))
      : catalogResponse(delivered)
  });

  const result = await client.check();

  assert.equal(result.status, 'error');
  assert.equal(result.error.kind, 'hash_mismatch');
  assert.equal(client.getActiveCatalog(), initial);
  assert.equal(client.getActiveVersion(), versionFor(initial));
});

test('errores de manifest conservan el último estado válido', async (t) => {
  const initial = catalog();
  const cases = [
    ['red', async () => { throw new Error('offline'); }, 'unavailable'],
    ['HTTP', async () => jsonResponse(null, { ok: false, status: 503 }), 'error'],
    ['JSON', async () => jsonResponse(null, {
      json: async () => { throw new SyntaxError('bad'); }
    }), 'error'],
    ['estructura', async () => jsonResponse({ version: 'bad' }), 'error']
  ];
  for (const [name, fetchImpl, expectedStatus] of cases) {
    await t.test(name, async () => {
      const client = createClient({ initial, fetchImpl });
      const result = await client.check();
      assert.equal(result.status, expectedStatus);
      assert.equal(result.catalog, initial);
      assert.equal(result.version, versionFor(initial));
    });
  }
});

test('error descargando catálogo conserva el último estado válido', async () => {
  const initial = catalog();
  const next = catalog([product({ price: 120 })]);
  let calls = 0;
  const client = createClient({
    initial,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return jsonResponse(manifestFor(next));
      throw new Error('offline');
    }
  });
  const result = await client.check();
  assert.equal(result.status, 'unavailable');
  assert.equal(result.catalog, initial);
  assert.equal(result.version, versionFor(initial));
});

test('JSON inválido con SHA válido conserva el último estado válido', async () => {
  const initial = catalog();
  const invalidJson = '{no';
  const client = createClient({
    initial,
    fetchImpl: async (url) => url.startsWith('/catalog-version')
      ? jsonResponse(manifestFor(invalidJson))
      : catalogResponse(invalidJson)
  });
  const result = await client.check();
  assert.equal(result.status, 'error');
  assert.equal(result.error.kind, 'invalid');
  assert.equal(result.catalog, initial);
});

test('dos checks simultáneos comparten la misma Promise y solicitud', async () => {
  const initial = catalog();
  let resolveManifest;
  let calls = 0;
  const deferred = new Promise((resolve) => { resolveManifest = resolve; });
  const client = createClient({
    initial,
    fetchImpl: () => {
      calls += 1;
      return deferred;
    }
  });
  const first = client.check();
  const second = client.check({ force: true });
  assert.equal(first, second);
  resolveManifest(jsonResponse(manifestFor(initial)));
  await first;
  assert.equal(calls, 1);
});

test('validación fresh espera el polling en curso y luego consulta un manifest nuevo', async () => {
  const initial = catalog();
  const next = catalog([product({ price: 140 })]);
  let resolvePolling;
  let calls = 0;
  const pollingResponse = new Promise((resolve) => { resolvePolling = resolve; });
  const client = createClient({
    initial,
    fetchImpl: async (url) => {
      calls += 1;
      if (calls === 1) return pollingResponse;
      if (url.startsWith('/catalog-version')) return jsonResponse(manifestFor(next));
      return catalogResponse(next);
    }
  });

  const polling = client.check();
  const finalValidation = client.check({ force: true, fresh: true });
  resolvePolling(jsonResponse(manifestFor(initial)));

  assert.equal((await polling).changed, false);
  const result = await finalValidation;
  assert.equal(result.changed, true);
  assert.equal(result.catalog.products[0].price, 140);
  assert.equal(calls, 3);
});

test('la ventana mínima evita que focus y visibility repitan una consulta reciente', async () => {
  let currentTime = 1_000;
  let calls = 0;
  const initial = catalog();
  const client = createClient({
    initial,
    now: () => currentTime,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(manifestFor(initial));
    }
  });
  await client.check();
  currentTime += 1;
  assert.equal((await client.check()).skipped, true);
  assert.equal(calls, 1);
});

test('una respuesta con requestId viejo no puede reemplazar una nueva', () => {
  assert.equal(shouldApplyCatalogResponse(1, 2), false);
  assert.equal(shouldApplyCatalogResponse(2, 2), true);
});

test('actualizar el catálogo no modifica la persistencia del carrito', async () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
  };
  const lines = [{ productId: 'shoe', quantity: 2, priceSnapshot: 100 }];
  writeCart(storage, lines);
  const next = catalog([product({ price: 120 })]);
  const client = createClient({
    fetchImpl: async (url) => url.startsWith('/catalog-version')
      ? jsonResponse(manifestFor(next))
      : catalogResponse(next)
  });
  assert.equal((await client.check()).changed, true);
  assert.deepEqual(readCart(storage), lines);
  assert.equal(memory.has(CART_STORAGE_KEY), true);
});

test('valida contratos de catálogo, manifest, intervalo y disparadores existentes', async () => {
  assert.equal(CATALOG_POLL_INTERVAL_MS, 60_000);
  assert.equal(isValidPublishedCatalog(catalog()), true);
  assert.equal(isValidCatalogVersion(manifestFor(catalog())), true);
  assert.equal(isValidCatalogVersion({ version: 'sha256-bad' }), false);

  const context = await readFile(new URL('../../src/context/CartContext.jsx', import.meta.url), 'utf8');
  const header = await readFile(new URL('../../src/components/layout/Header.jsx', import.meta.url), 'utf8');
  const checkout = await readFile(new URL('../../src/components/checkout/CheckoutModal.jsx', import.meta.url), 'utf8');
  const checkoutValidation = await readFile(new URL('../../src/services/checkoutValidation.js', import.meta.url), 'utf8');
  assert.match(context, /startCatalogPolling/);
  assert.match(header, /await checkCatalog\(\)/);
  assert.match(checkout, /validateCheckoutSubmission/);
  assert.match(checkoutValidation, /checkCatalog\(\{ force: true, fresh: true, notify: false \}\)/);
});

test('Vite publica catálogo y versión desde las fuentes generadas', async () => {
  const viteConfig = await readFile(new URL('../../vite.config.js', import.meta.url), 'utf8');
  assert.match(viteConfig, /generated\/catalog\.json/);
  assert.match(viteConfig, /generated\/catalog-version\.json/);
});
