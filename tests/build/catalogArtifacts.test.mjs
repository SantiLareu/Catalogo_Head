import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vite emite los dos artefactos generados en la raíz de la publicación', async () => {
  const source = await readFile(new URL('../../vite.config.js', import.meta.url), 'utf8');
  assert.match(source, /fileName: 'catalog\.json'/);
  assert.match(source, /fileName: 'catalog-version\.json'/);
  assert.match(source, /generated\/catalog\.json/);
  assert.match(source, /generated\/catalog-version\.json/);
});
