import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createAppVersion } from '../../scripts/app-version.mjs';

async function createWorkspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-app-version-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await Promise.all([
    fs.mkdir(path.join(root, 'assets')),
    fs.mkdir(path.join(root, 'public')),
    fs.mkdir(path.join(root, 'src')),
    fs.mkdir(path.join(root, 'generated'))
  ]);
  await Promise.all([
    fs.writeFile(path.join(root, 'assets', 'logo.svg'), '<svg/>'),
    fs.writeFile(path.join(root, 'public', 'favicon.png'), 'png'),
    fs.writeFile(path.join(root, 'src', 'main.jsx'), 'render()'),
    fs.writeFile(path.join(root, 'index.html'), '<main/>'),
    fs.writeFile(path.join(root, 'package.json'), '{}'),
    fs.writeFile(path.join(root, 'package-lock.json'), '{}'),
    fs.writeFile(path.join(root, 'vite.config.js'), 'export default {}'),
    fs.writeFile(path.join(root, 'generated', 'catalog.json'), '{"price":1}')
  ]);
  return root;
}

test('versión de app es determinista y no depende del catálogo generado', async (t) => {
  const root = await createWorkspace(t);
  const first = await createAppVersion(root);
  assert.equal(await createAppVersion(root), first);

  await fs.writeFile(path.join(root, 'generated', 'catalog.json'), '{"price":2}');
  assert.equal(await createAppVersion(root), first);

  await fs.writeFile(path.join(root, 'src', 'main.jsx'), 'renderNewApp()');
  assert.notEqual(await createAppVersion(root), first);
});

test('cambiar un asset publicado cambia la versión de app', async (t) => {
  const root = await createWorkspace(t);
  const first = await createAppVersion(root);
  await fs.writeFile(path.join(root, 'assets', 'logo.svg'), '<svg>nuevo</svg>');
  assert.notEqual(await createAppVersion(root), first);
});
