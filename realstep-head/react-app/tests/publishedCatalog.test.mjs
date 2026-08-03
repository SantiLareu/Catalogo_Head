import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createPublishedCatalogClient,
  getPublishedCatalogUrl,
  isValidPublishedCatalog,
  shouldApplyCatalogResponse
} from '../src/services/publishedCatalog.js';
import { initializePriceSnapshots, reconcileCart } from '../src/services/cartReconciliation.js';

const product = ({
  id = 'shoe',
  price = 100,
  sizes = [{ size: '40', stock: 3, inStock: true }],
  variants = []
} = {}) => ({ id, name: 'Zapatilla', price, sizes, variants });

const catalog = (products = [product()]) => ({ categories: [], products });
const response = (body, options = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  json: options.json ?? (async () => body)
});

test('construye una URL relativa a la base de publicación', () => {
  assert.equal(
    getPublishedCatalogUrl('https://example.test/catalogo/'),
    'https://example.test/catalogo/catalog.json'
  );
});

test('consulta sin caché y reconoce un catálogo vigente sin cambios', async () => {
  const calls = [];
  const initial = catalog();
  const client = createPublishedCatalogClient({
    initialCatalog: initial,
    url: '/catalog.json',
    fetchImpl: async (...args) => {
      calls.push(args);
      return response(initial);
    }
  });
  const result = await client.check();
  assert.equal(result.status, 'current');
  assert.equal(result.changed, false);
  assert.deepEqual(calls, [['/catalog.json', { cache: 'no-store' }]]);
});

test('comparte una consulta simultánea', async () => {
  let resolveFetch;
  let calls = 0;
  const deferred = new Promise((resolve) => { resolveFetch = resolve; });
  const client = createPublishedCatalogClient({
    initialCatalog: catalog(),
    url: '/catalog.json',
    fetchImpl: () => {
      calls += 1;
      return deferred;
    }
  });
  const first = client.check();
  const second = client.check({ force: true });
  assert.equal(first, second);
  resolveFetch(response(catalog()));
  await first;
  assert.equal(calls, 1);
});

test('respeta la ventana mínima y force la omite', async () => {
  let currentTime = 1_000;
  let calls = 0;
  const initial = catalog();
  const client = createPublishedCatalogClient({
    initialCatalog: initial,
    fetchImpl: async () => {
      calls += 1;
      return response(initial);
    },
    minIntervalMs: 60_000,
    now: () => currentTime,
    url: '/catalog.json'
  });
  await client.check();
  currentTime += 30_000;
  const skipped = await client.check();
  assert.equal(skipped.skipped, true);
  assert.equal(calls, 1);
  await client.check({ force: true });
  assert.equal(calls, 2);
});

test('conserva el catálogo activo ante red caída, HTTP inválido, JSON roto o estructura inválida', async (t) => {
  const initial = catalog();
  const cases = [
    ['red', async () => { throw new Error('offline'); }, 'unavailable'],
    ['HTTP', async () => response(null, { ok: false, status: 503 }), 'error'],
    ['JSON', async () => response(null, { json: async () => { throw new SyntaxError('bad'); } }), 'error'],
    ['estructura', async () => response({ products: [] }), 'error']
  ];
  for (const [name, fetchImpl, expectedStatus] of cases) {
    await t.test(name, async () => {
      const client = createPublishedCatalogClient({ initialCatalog: initial, fetchImpl, url: '/catalog.json' });
      const result = await client.check();
      assert.equal(result.status, expectedStatus);
      assert.equal(result.catalog, initial);
      assert.equal(client.getActiveCatalog(), initial);
    });
  }
});

test('detecta cambios remotos y los reconcilia sin eliminar líneas', async (t) => {
  const initial = catalog();
  const line = { productId: 'shoe', size: '40', quantity: 3, priceSnapshot: 100 };
  const cases = [
    ['producto eliminado', catalog([]), 'product_removed'],
    ['talle agotado', catalog([product({ sizes: [{ size: '40', stock: 0, inStock: false }] })]), 'size_unavailable'],
    ['cantidad superior al stock', catalog([product({ sizes: [{ size: '40', stock: 2, inStock: true }] })]), 'unavailable'],
    ['precio cambiado', catalog([product({ price: 120 })]), 'price_changed']
  ];
  for (const [name, remote, issue] of cases) {
    await t.test(name, async () => {
      const client = createPublishedCatalogClient({
        initialCatalog: initial,
        fetchImpl: async () => response(remote),
        url: '/catalog.json'
      });
      const result = await client.check();
      const report = reconcileCart([line], result.catalog.products);
      assert.equal(result.status, 'changes_detected');
      assert.equal(report.entries.length, 1);
      assert.ok(report.entries[0].issues.includes(issue));
      assert.equal(report.checkoutBlocked, true);
    });
  }

  await t.test('variante eliminada', async () => {
    const withVariant = catalog([product({
      sizes: [],
      variants: [{ id: 'black', price: 110, sizes: [{ size: '40', stock: 2, inStock: true }] }]
    })]);
    const withoutVariant = catalog([product({ sizes: [], variants: [] })]);
    const client = createPublishedCatalogClient({
      initialCatalog: withVariant,
      fetchImpl: async () => response(withoutVariant),
      url: '/catalog.json'
    });
    const result = await client.check();
    const report = reconcileCart([{
      productId: 'shoe', variantId: 'black', size: '40', quantity: 1, priceSnapshot: 110
    }], result.catalog.products);
    assert.deepEqual(report.entries[0].issues, ['variant_removed']);
  });

  await t.test('availability-only mantiene válida cantidad 10 disponible', async () => {
    const availabilityCatalog = {
      ...catalog([product({ sizes: [{ size: '40', stock: 1, inStock: true }] })]),
      stockIsAvailabilityOnly: true
    };
    const client = createPublishedCatalogClient({
      initialCatalog: catalog(),
      fetchImpl: async () => response(availabilityCatalog),
      url: '/catalog.json'
    });
    const result = await client.check();
    const report = reconcileCart([{
      productId: 'shoe',
      size: '40',
      quantity: 10,
      priceSnapshot: 100
    }], result.catalog.products, result.catalog.stockIsAvailabilityOnly);
    assert.equal(result.status, 'changes_detected');
    assert.deepEqual(report.entries[0].issues, []);
    assert.equal(report.checkoutBlocked, false);
  });
});

test('mantiene compatibilidad con una línea legacy', async () => {
  const initial = catalog();
  const initialized = initializePriceSnapshots([{ productId: 'shoe', size: '40', quantity: 1 }], initial.products);
  assert.deepEqual(initialized, [{ productId: 'shoe', size: '40', quantity: 1, priceSnapshot: 100 }]);
});

test('valida estructura y evita aplicar respuestas obsoletas', () => {
  assert.equal(isValidPublishedCatalog(catalog()), true);
  assert.equal(isValidPublishedCatalog({ categories: [], products: [{ id: 'bad' }] }), false);
  assert.equal(shouldApplyCatalogResponse(1, 2), false);
  assert.equal(shouldApplyCatalogResponse(2, 2), true);
});

test('los disparadores cubren carrito, checkout, envío, visibilidad y foco', async () => {
  const context = await readFile(new URL('../src/context/CartContext.jsx', import.meta.url), 'utf8');
  const header = await readFile(new URL('../src/components/layout/Header.jsx', import.meta.url), 'utf8');
  const checkout = await readFile(new URL('../src/components/checkout/CheckoutModal.jsx', import.meta.url), 'utf8');
  const checkoutActions = await readFile(new URL('../src/components/checkout/CheckoutActions.jsx', import.meta.url), 'utf8');
  assert.match(context, /visibilitychange/);
  assert.match(context, /addEventListener\('focus'/);
  assert.match(header, /await checkCatalog\(\)/);
  assert.match(header, /const openCart = async/);
  assert.match(checkout, /checkCatalog\(\{ force: true \}\)/);
  assert.match(checkout, /Comprobando catálogo…/);
  assert.match(checkoutActions, /disabled=\{sending \|\| checkingCatalog\}/);
});

test('el build publica catalog.json desde la fuente generada', async () => {
  const viteConfig = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8');
  assert.match(viteConfig, /generated\/catalog\.json/);
  assert.match(viteConfig, /fileName: 'catalog\.json'/);
  assert.match(viteConfig, /Cache-Control', 'no-store'/);
});
