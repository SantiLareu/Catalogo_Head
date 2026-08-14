import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Vite emite catálogo y versiones separadas en la raíz de la publicación', async () => {
  const source = await readFile(new URL('../../vite.config.js', import.meta.url), 'utf8');
  assert.match(source, /fileName: 'catalog\.json'/);
  assert.match(source, /fileName: 'catalog-version\.json'/);
  assert.match(source, /generated\/catalog\.json/);
  assert.match(source, /generated\/catalog-version\.json/);
  assert.match(source, /path\.join\(outputRoot, 'app-version\.json'\)/);
  assert.match(source, /__REALSTEP_APP_VERSION__/);
  assert.doesNotMatch(source, /\/Catalogo_Head\//);
});
