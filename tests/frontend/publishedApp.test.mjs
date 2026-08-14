import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import test from 'node:test';
import {
  APP_POLL_INTERVAL_MS,
  APP_RELOAD_STORAGE_KEY,
  createPublishedAppClient,
  getPublishedAppVersionUrl,
  startAppVersionPolling
} from '../../src/services/publishedApp.js';
import { readCart, writeCart } from '../../src/services/cartStorage.js';

const version = (character) => 'sha256-' + character.repeat(64);
const bytes = (value) => new TextEncoder().encode(value);
const readinessFile = (path, value) => ({
  path,
  size: bytes(value).byteLength,
  sha256: createHash('sha256').update(bytes(value)).digest('hex')
});
const manifest = (appVersion, files = [readinessFile('index.html', 'new html')]) => ({
  schemaVersion: 1,
  version: appVersion,
  files
});
const jsonResponse = (value, options = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  json: options.json ?? (async () => value)
});
const fileResponse = (value, options = {}) => ({
  ok: options.ok ?? true,
  status: options.status ?? 200,
  arrayBuffer: async () => {
    const contents = bytes(value);
    return contents.buffer.slice(contents.byteOffset, contents.byteOffset + contents.byteLength);
  }
});

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    values
  };
}

function createClient({
  loadedVersion = version('a'),
  publishedVersion = loadedVersion,
  fetchImpl,
  reload,
  storage = memoryStorage(),
  isReloadSafe
} = {}) {
  return createPublishedAppClient({
    loadedVersion,
    baseUrl: 'https://example.test/catalog/',
    versionUrl: 'https://example.test/catalog/app-version.json',
    cryptoImpl: webcrypto,
    storage,
    reload,
    isReloadSafe,
    now: () => 123,
    fetchImpl: fetchImpl ?? (async () => jsonResponse(manifest(publishedVersion)))
  });
}

test('misma appVersion no recarga ni consulta entrypoints', async () => {
  let reloads = 0;
  let calls = 0;
  const client = createClient({
    reload: () => { reloads += 1; },
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(manifest(version('a')));
    }
  });
  assert.equal((await client.check()).status, 'current');
  assert.equal(reloads, 0);
  assert.equal(calls, 1);
});

test('appVersion distinta y deploy completo solicita exactamente un reload', async () => {
  let reloads = 0;
  const calls = [];
  const client = createClient({
    publishedVersion: version('b'),
    reload: () => { reloads += 1; },
    fetchImpl: async (url, options) => {
      calls.push([url, options]);
      return url.includes('app-version.json')
        ? jsonResponse(manifest(version('b')))
        : fileResponse('new html');
    }
  });
  assert.equal((await client.check()).status, 'reload_requested');
  assert.equal((await client.check()).status, 'inactive');
  assert.equal(reloads, 1);
  assert.match(calls[0][0], /app-version\.json\?check=123-1$/);
  assert.deepEqual(calls[0][1], { cache: 'no-store' });
  assert.match(calls[1][0], /index\.html\?ready=sha256-/);
});

test('errores de red, HTTP, JSON y manifest inválido no recargan', async (t) => {
  const cases = [
    ['red', async () => { throw new Error('offline'); }, 'unavailable'],
    ['HTTP', async () => jsonResponse(null, { ok: false, status: 404 }), 'error'],
    ['JSON', async () => jsonResponse(null, { json: async () => { throw new SyntaxError('bad'); } }), 'invalid'],
    ['manifest', async () => jsonResponse({ version: version('b') }), 'invalid']
  ];
  for (const [name, fetchImpl, status] of cases) {
    await t.test(name, async () => {
      let reloads = 0;
      const result = await createClient({ fetchImpl, reload: () => { reloads += 1; } }).check();
      assert.equal(result.status, status);
      assert.equal(reloads, 0);
    });
  }
});

test('deploy parcial, 404 de asset o hash incorrecto no producen reload destructivo', async (t) => {
  for (const [name, assetResponse] of [
    ['404', fileResponse('', { ok: false, status: 404 })],
    ['hash', fileResponse('old html')]
  ]) {
    await t.test(name, async () => {
      let calls = 0;
      let reloads = 0;
      const client = createClient({
        reload: () => { reloads += 1; },
        fetchImpl: async () => ++calls === 1
          ? jsonResponse(manifest(version('b')))
          : assetResponse
      });
      assert.equal((await client.check()).status, 'deploy_incomplete');
      assert.equal(reloads, 0);
    });
  }
});

test('una versión ya intentada en sessionStorage evita loops entre recargas', async () => {
  const storage = memoryStorage();
  storage.setItem(APP_RELOAD_STORAGE_KEY, version('b'));
  let reloads = 0;
  const client = createClient({
    publishedVersion: version('b'),
    storage,
    reload: () => { reloads += 1; }
  });
  assert.equal((await client.check()).status, 'reload_already_requested');
  assert.equal(reloads, 0);
});

test('si sessionStorage no permite guardar el guard no arriesga un loop', async () => {
  let reloads = 0;
  const client = createClient({
    publishedVersion: version('b'),
    storage: {
      getItem: () => null,
      setItem: () => { throw new Error('blocked'); }
    },
    reload: () => { reloads += 1; },
    fetchImpl: async (url) => url.includes('app-version.json')
      ? jsonResponse(manifest(version('b')))
      : fileResponse('new html')
  });
  assert.equal((await client.check()).status, 'reload_guard_unavailable');
  assert.equal(reloads, 0);
});

test('checkout abierto difiere el reload hasta que sea seguro', async () => {
  const client = createClient({
    publishedVersion: version('b'),
    isReloadSafe: () => false
  });
  assert.equal((await client.check()).status, 'deferred');
});

test('polling pausa oculto, revisa al volver visible/focus y limpia recursos', () => {
  const listeners = (hidden = false) => {
    const values = new Map();
    return {
      hidden,
      addEventListener: (type, callback) => values.set(type, callback),
      removeEventListener: (type, callback) => {
        if (values.get(type) === callback) values.delete(type);
      },
      dispatch: (type) => values.get(type)?.(),
      values
    };
  };
  const documentTarget = listeners();
  const windowTarget = listeners();
  let checks = 0;
  let intervalCallback;
  const cleared = [];
  const cleanup = startAppVersionPolling({
    client: { check: () => { checks += 1; } },
    documentTarget,
    windowTarget,
    setIntervalImpl: (callback, delay) => {
      intervalCallback = callback;
      assert.equal(delay, APP_POLL_INTERVAL_MS);
      return 9;
    },
    clearIntervalImpl: (id) => cleared.push(id)
  });
  intervalCallback();
  documentTarget.hidden = true;
  intervalCallback();
  windowTarget.dispatch('focus');
  documentTarget.hidden = false;
  documentTarget.dispatch('visibilitychange');
  windowTarget.dispatch('focus');
  assert.equal(checks, 3);
  cleanup();
  assert.deepEqual(cleared, [9]);
  assert.equal(documentTarget.values.size, 0);
  assert.equal(windowTarget.values.size, 0);
});

test('resuelve GitHub Pages, dominio personalizado y nunca hardcodea el subpath', () => {
  assert.equal(
    getPublishedAppVersionUrl('https://owner.github.io/repo/'),
    'https://owner.github.io/repo/app-version.json'
  );
  assert.equal(
    getPublishedAppVersionUrl('https://head.real-step.com.ar/'),
    'https://head.real-step.com.ar/app-version.json'
  );
  assert.equal(getPublishedAppVersionUrl.toString().includes('/Catalogo_Head/'), false);
});

test('polling de app no modifica localStorage del carrito', async () => {
  const cartStorage = memoryStorage();
  const lines = [{ productId: 'sock', quantity: 6, priceSnapshot: 5000 }];
  writeCart(cartStorage, lines);
  const client = createClient({ publishedVersion: version('a') });
  await client.check();
  assert.deepEqual(readCart(cartStorage), lines);
});

test('catálogo nuevo con appVersion igual no recarga; app nueva recarga aunque cambie el catálogo', async () => {
  let reloads = 0;
  assert.equal((await createClient({ reload: () => { reloads += 1; } }).check()).status, 'current');
  const next = createClient({
    publishedVersion: version('b'),
    reload: () => { reloads += 1; },
    fetchImpl: async (url) => url.includes('app-version.json')
      ? jsonResponse(manifest(version('b')))
      : fileResponse('new html')
  });
  assert.equal((await next.check()).status, 'reload_requested');
  assert.equal(reloads, 1);
});
