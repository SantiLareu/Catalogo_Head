import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  buildCatalogVersion,
  createCatalogVersionContents,
  hashCatalogBytes
} from '../../scripts/catalog-import/catalogVersion.mjs';
import {
  createTestWorkspace,
  createWorkbookFixture,
  diagnosticCodes,
  runFixture
} from './helpers.mjs';

test('el manifiesto es determinista y usa el SHA-256 de los bytes exactos', () => {
  const catalogContents = '{\n  "schemaVersion": 1\n}\n';
  const expectedHash = crypto
    .createHash('sha256')
    .update(Buffer.from(catalogContents, 'utf8'))
    .digest('hex');
  const manifest = buildCatalogVersion(catalogContents);

  assert.deepEqual(manifest, {
    schemaVersion: 1,
    version: 'sha256-' + expectedHash,
    catalogFile: 'catalog.json'
  });
  assert.match(manifest.version, /^sha256-[a-f0-9]{64}$/);
  assert.equal(
    createCatalogVersionContents(catalogContents),
    createCatalogVersionContents(catalogContents)
  );
});

test('cualquier cambio de bytes del catálogo cambia su versión', () => {
  assert.notEqual(
    hashCatalogBytes('{"price":100}\n'),
    hashCatalogBytes('{"price":101}\n')
  );
});

test('dos importaciones iguales generan catálogo y manifiesto idénticos', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath);

  const first = await runFixture(workspace);
  assert.equal(first.exitCode, 0);
  const firstCatalog = await fs.readFile(workspace.outputPath);
  const firstManifest = await fs.readFile(workspace.versionOutputPath);

  const secondWorkspace = {
    ...workspace,
    outputPath: path.join(workspace.directory, 'catalog-copy.json'),
    versionOutputPath: path.join(workspace.directory, 'catalog-copy-version.json')
  };
  const second = await runFixture(secondWorkspace);
  assert.equal(second.exitCode, 0);

  assert.deepEqual(await fs.readFile(secondWorkspace.outputPath), firstCatalog);
  assert.deepEqual(await fs.readFile(secondWorkspace.versionOutputPath), firstManifest);

  const manifest = JSON.parse(firstManifest.toString('utf8'));
  const exactHash = crypto.createHash('sha256').update(firstCatalog).digest('hex');
  assert.equal(manifest.version, 'sha256-' + exactHash);
});

test('--check detecta catálogo viejo y no escribe ningún artefacto', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath);
  assert.equal((await runFixture(workspace)).exitCode, 0);
  const manifestBefore = await fs.readFile(workspace.versionOutputPath);
  await fs.writeFile(workspace.outputPath, '{"old":true}\n', 'utf8');
  const catalogBefore = await fs.readFile(workspace.outputPath);

  const result = await runFixture(workspace, { check: true });

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('GENERATED_CATALOG_MISMATCH'));
  assert.deepEqual(await fs.readFile(workspace.outputPath), catalogBefore);
  assert.deepEqual(await fs.readFile(workspace.versionOutputPath), manifestBefore);
});

test('--check detecta manifiesto viejo y no escribe ningún artefacto', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath);
  assert.equal((await runFixture(workspace)).exitCode, 0);
  const catalogBefore = await fs.readFile(workspace.outputPath);
  await fs.writeFile(workspace.versionOutputPath, '{"old":true}\n', 'utf8');
  const manifestBefore = await fs.readFile(workspace.versionOutputPath);

  const result = await runFixture(workspace, { check: true });

  assert.equal(result.exitCode, 1);
  assert.ok(
    diagnosticCodes(result).includes('GENERATED_CATALOG_VERSION_MISMATCH')
  );
  assert.deepEqual(await fs.readFile(workspace.outputPath), catalogBefore);
  assert.deepEqual(await fs.readFile(workspace.versionOutputPath), manifestBefore);
});
