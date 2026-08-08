import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  countCatalog,
  compareCatalogs,
  compareCatalogFiles,
  formatCatalogDifference
} from '../../scripts/catalog-import/catalogBaseline.mjs';
import { runCatalogComparison } from '../../scripts/compare-catalog.mjs';
import { runImport } from '../../scripts/import-products.mjs';
import { runBaselineUpdate } from '../../scripts/update-catalog-baseline.mjs';
import {
  createTestWorkspace,
  createWorkbookFixture,
  repoRoot
} from './helpers.mjs';

const approvedCatalogPath = path.join(repoRoot, 'generated', 'catalog.json');
const approvedBaselinePath = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'catalog-baseline.json'
);

async function approvedCatalog() {
  return JSON.parse(await fs.readFile(approvedCatalogPath, 'utf8'));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test('snapshot canónico coincide con el catálogo aprobado', async function() {
  const result = await compareCatalogFiles({
    baselinePath: approvedBaselinePath,
    catalogPath: approvedCatalogPath
  });
  assert.deepEqual(result.differences, []);
  assert.deepEqual(result.counts, countCatalog(result.baseline));
});

test('diagnóstico identifica diferencia en producto', async function() {
  const expected = await approvedCatalog();
  const actual = clone(expected);
  actual.products[0].price += 1;
  const difference = compareCatalogs(expected, actual)[0];
  assert.equal(
    difference.path,
    `products[${expected.products[0].id}].price`
  );
  assert.match(formatCatalogDifference(difference), /esperado .*recibido/);
});

test('diagnóstico identifica variante e ID con espacio final', async function() {
  const expected = await approvedCatalog();
  const productIndex = expected.products.findIndex((product) =>
    product.variants.some((variant) => variant.id === 'black ')
  );
  const variantIndex = expected.products[productIndex].variants.findIndex(
    (variant) => variant.id === 'black '
  );
  const actual = clone(expected);
  actual.products[productIndex].variants[variantIndex].code = 'CAMBIO';
  const difference = compareCatalogs(expected, actual)[0];
  assert.match(difference.path, /\.variants\["black "\]\.code$/);

  const changedId = clone(expected);
  changedId.products[productIndex].variants[variantIndex].id = 'black';
  const idDifferences = compareCatalogs(expected, changedId);
  assert.ok(idDifferences.some((item) => item.path.endsWith('.id')));
  assert.ok(idDifferences.some((item) => item.path.includes('"black "')));
});

test('diagnóstico identifica imagen, stock y categoría', async function() {
  const expected = await approvedCatalog();

  const imageActual = clone(expected);
  imageActual.products[0].images[0] = 'assets/cambio.webp';
  assert.match(compareCatalogs(expected, imageActual)[0].path, /\.images\[0\]$/);

  const stockActual = clone(expected);
  const productIndex = expected.products.findIndex(
    (product) => product.sizes.length > 0
  );
  stockActual.products[productIndex].sizes[0].stock += 1;
  assert.match(compareCatalogs(expected, stockActual)[0].path, /\.sizes\["[^"]+"\]\.stock$/);

  const categoryActual = clone(expected);
  categoryActual.categories[0].enabled = !categoryActual.categories[0].enabled;
  assert.equal(
    compareCatalogs(expected, categoryActual)[0].path,
    `categories[${expected.categories[0].id}].enabled`
  );
});

test('snapshot inexistente y corrupto producen error controlado', async function(t) {
  const workspace = await createTestWorkspace(t);
  await assert.rejects(
    compareCatalogFiles({
      baselinePath: path.join(workspace.directory, 'missing.json'),
      catalogPath: approvedCatalogPath
    }),
    /No existe el snapshot canónico/
  );

  const corruptPath = path.join(workspace.directory, 'corrupt.json');
  await fs.writeFile(corruptPath, '{no', 'utf8');
  await assert.rejects(
    compareCatalogFiles({
      baselinePath: corruptPath,
      catalogPath: approvedCatalogPath
    }),
    /JSON corrupto/
  );
});

test('compare-catalog no modifica el snapshot', async function() {
  const before = await fs.readFile(approvedBaselinePath);
  const result = await runCatalogComparison({
    baselinePath: approvedBaselinePath,
    catalogPath: approvedCatalogPath
  });
  const after = await fs.readFile(approvedBaselinePath);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(after, before);
});

test('actualización del snapshot es explícita y determinista', async function(t) {
  const workspace = await createTestWorkspace(t);
  const baselinePath = path.join(workspace.directory, 'baseline.json');
  await createWorkbookFixture(workspace.workbookPath);
  await fs.copyFile(approvedCatalogPath, workspace.outputPath);

  await assert.rejects(
    runBaselineUpdate({
      repoRoot,
      inputPath: workspace.workbookPath,
      catalogPath: workspace.outputPath,
      baselinePath,
      confirm: false
    }),
    /confirmación explícita/
  );
  await assert.rejects(fs.access(baselinePath));

  const first = await runBaselineUpdate({
    repoRoot,
    inputPath: workspace.workbookPath,
    catalogPath: workspace.outputPath,
    baselinePath,
    confirm: true
  });
  assert.equal(first.exitCode, 0);
  const firstBytes = await fs.readFile(baselinePath);

  const second = await runBaselineUpdate({
    repoRoot,
    inputPath: workspace.workbookPath,
    catalogPath: workspace.outputPath,
    baselinePath,
    confirm: true
  });
  assert.equal(second.exitCode, 0);
  assert.deepEqual(await fs.readFile(baselinePath), firstBytes);
  assert.equal(firstBytes.at(-1), 10);
});

test('importación inválida no modifica JSON ni snapshot', async function(t) {
  const workspace = await createTestWorkspace(t);
  const baselinePath = path.join(workspace.directory, 'baseline.json');
  const previousJson = '{"previous":true}\n';
  const previousBaseline = '{"approved":true}\n';
  await fs.writeFile(workspace.outputPath, previousJson, 'utf8');
  await fs.writeFile(baselinePath, previousBaseline, 'utf8');
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('G2').value = -1;
  });

  const result = await runImport({
    inputPath: workspace.workbookPath,
    outputPath: workspace.outputPath,
    repoRoot,
    check: false,
    strict: false
  });
  assert.equal(result.exitCode, 1);
  assert.equal(await fs.readFile(workspace.outputPath, 'utf8'), previousJson);
  assert.equal(await fs.readFile(baselinePath, 'utf8'), previousBaseline);
});

test('importador funciona en una raíz temporal sin js/data', async function(t) {
  const workspace = await createTestWorkspace(t);
  const isolatedRoot = path.join(workspace.directory, 'isolated-root');
  const isolatedWorkbook = path.join(isolatedRoot, 'catalog', 'products.xlsx');
  const isolatedOutput = path.join(isolatedRoot, 'generated', 'catalog.json');
  await fs.mkdir(path.dirname(isolatedWorkbook), { recursive: true });
  await createWorkbookFixture(isolatedWorkbook);
  await fs.cp(path.join(repoRoot, 'assets'), path.join(isolatedRoot, 'assets'), {
    recursive: true
  });

  await assert.rejects(fs.access(path.join(isolatedRoot, 'js', 'data')));
  const result = await runImport({
    inputPath: isolatedWorkbook,
    outputPath: isolatedOutput,
    repoRoot: isolatedRoot,
    check: false,
    strict: false
  });
  assert.equal(result.exitCode, 0);
  const baseline = JSON.parse(
    await fs.readFile(approvedBaselinePath, 'utf8')
  );
  assert.deepEqual(compareCatalogs(baseline, result.catalog), []);
  assert.deepEqual(countCatalog(result.catalog), countCatalog(baseline));
  await fs.access(isolatedOutput);
  await assert.rejects(fs.access(path.join(isolatedRoot, 'js', 'data')));
});
