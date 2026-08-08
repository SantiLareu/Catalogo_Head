import assert from 'node:assert/strict';
import test from 'node:test';
import { startCatalogPolling } from '../../src/services/catalogPolling.js';
import { CATALOG_POLL_INTERVAL_MS } from '../../src/services/publishedCatalog.js';

function eventTarget() {
  const listeners = new Map();
  return {
    hidden: false,
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type, listener) => {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
    dispatch: (type) => listeners.get(type)?.(),
    listeners
  };
}

test('polling usa 60 segundos, pausa oculto y consulta al volver visible o enfocar', async () => {
  const documentTarget = eventTarget();
  const windowTarget = eventTarget();
  const calls = [];
  let intervalCallback;
  const cleanup = startCatalogPolling({
    check: (options) => calls.push(options),
    documentTarget,
    windowTarget,
    setIntervalImpl: (callback, interval) => {
      intervalCallback = callback;
      assert.equal(interval, CATALOG_POLL_INTERVAL_MS);
      return 42;
    },
    clearIntervalImpl: () => {}
  });

  intervalCallback();
  documentTarget.hidden = true;
  intervalCallback();
  windowTarget.dispatch('focus');
  documentTarget.hidden = false;
  documentTarget.dispatch('visibilitychange');
  windowTarget.dispatch('focus');

  assert.deepEqual(calls, [
    { background: true },
    { background: true },
    { background: true }
  ]);
  cleanup();
});

test('cleanup cancela timer y elimina exactamente ambos listeners', () => {
  const documentTarget = eventTarget();
  const windowTarget = eventTarget();
  const cleared = [];
  const cleanup = startCatalogPolling({
    check: () => {},
    documentTarget,
    windowTarget,
    setIntervalImpl: () => 77,
    clearIntervalImpl: (id) => cleared.push(id)
  });

  assert.equal(documentTarget.listeners.size, 1);
  assert.equal(windowTarget.listeners.size, 1);
  cleanup();
  assert.deepEqual(cleared, [77]);
  assert.equal(documentTarget.listeners.size, 0);
  assert.equal(windowTarget.listeners.size, 0);
});
