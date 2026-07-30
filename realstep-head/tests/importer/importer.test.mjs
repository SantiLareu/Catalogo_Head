import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
  countCatalog,
  compareCatalogs
} from '../../scripts/catalog-import/catalogBaseline.mjs';
import {
  createTestWorkspace,
  createWorkbookFixture,
  diagnosticCodes,
  repoRoot,
  runFixture
} from './helpers.mjs';

const approvedBaselinePath = path.join(
  repoRoot,
  'tests',
  'fixtures',
  'catalog-baseline.json'
);

test('Excel válido genera el catálogo esperado', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath);
  const baseline = JSON.parse(
    await fs.readFile(approvedBaselinePath, 'utf8')
  );

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 0);
  assert.equal(result.diagnostics.errors.length, 0);
  assert.deepEqual(compareCatalogs(baseline, result.catalog), []);
  assert.deepEqual(countCatalog(result.catalog), countCatalog(baseline));
  await fs.access(workspace.outputPath);
});

test('rechaza un producto duplicado', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    const sheet = workbook.getWorksheet('Productos');
    sheet.addRow(sheet.getRow(2).values.slice(1));
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('PRODUCT_ID_DUPLICATE'));
});

test('rechaza una variante duplicada dentro del producto', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    const sheet = workbook.getWorksheet('Variantes');
    sheet.addRow(sheet.getRow(2).values.slice(1));
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('VARIANT_ID_DUPLICATE'));
});

test('rechaza una variante sin código', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Variantes').getCell('C2').value = '';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('VARIANT_CODE_REQUIRED'));
});

test('rechaza una referencia a producto inexistente', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Variantes').getCell('A2').value =
      'producto-inexistente';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('VARIANT_PRODUCT_NOT_FOUND'));
});

test('rechaza una referencia a variante inexistente', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Imagenes').getCell('B2').value =
      'variante-inexistente';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('IMAGE_VARIANT_NOT_FOUND'));
});

test('rechaza una categoría inexistente', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('C2').value =
      'categoria-inexistente';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('PRODUCT_CATEGORY_INVALID'));
});

test('rechaza una subcategoría inexistente', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('D50').value =
      'subcategoria-inexistente';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(
    diagnosticCodes(result).includes('PRODUCT_SUBCATEGORY_INVALID')
  );
});

test('rechaza un género inválido', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('E17').value =
      'otro-genero';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('PRODUCT_GENDER_INVALID'));
});

test('rechaza un talle fuera de Listas', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Stock').getCell('C2').value = 'TALLE-INVALIDO';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('STOCK_SIZE_INVALID'));
});

test('rechaza un precio negativo', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('G2').value = -1;
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('PRODUCT_PRICE_NEGATIVE'));
});

test('rechaza stock decimal', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Stock').getCell('D2').value = 1.5;
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('STOCK_DECIMAL'));
});

test('rechaza stock negativo', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Stock').getCell('D2').value = -1;
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('STOCK_NEGATIVE'));
});

test('rechaza una imagen inexistente', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Imagenes').getCell('C2').value =
      'assets/products/calzado/no-existe.webp';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('IMAGE_NOT_FOUND'));
});

test('rechaza una extensión de imagen no permitida', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Imagenes').getCell('C2').value =
      'assets/products/calzado/ace-m1.gif';
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('IMAGE_EXTENSION_INVALID'));
});

test('rechaza diferencias de capitalización en imágenes', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    const cell = workbook.getWorksheet('Imagenes').getCell('C2');
    cell.value = String(cell.value).replace(
      'assets/products/calzado/',
      'assets/products/Calzado/'
    );
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('IMAGE_PATH_CASE_MISMATCH'));
});

test('rechaza un orden de producto duplicado', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    const sheet = workbook.getWorksheet('Productos');
    sheet.getCell('J3').value = sheet.getCell('J2').value;
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('PRODUCT_ORDER_DUPLICATE'));
});

test('rechaza un producto activo sin imágenes', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    const sheet = workbook.getWorksheet('Imagenes');

    for (let row = sheet.rowCount; row >= 2; row -= 1) {
      if (sheet.getCell(row, 1).value === 'ace-m1') {
        sheet.spliceRows(row, 1);
      }
    }
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(
    diagnosticCodes(result).includes('ACTIVE_PRODUCT_WITHOUT_IMAGES')
  );
});

test('rechaza fórmulas de Excel', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('G2').value = {
      formula: '1+1',
      result: 2
    };
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('FORMULA_NOT_ALLOWED'));
});

test('rechaza filas parcialmente completas', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').addRow(['producto-parcial']);
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.ok(diagnosticCodes(result).includes('PRODUCT_NAME_REQUIRED'));
  assert.ok(diagnosticCodes(result).includes('PRODUCT_CATEGORY_REQUIRED'));
});

test('un archivo inválido no sobrescribe el JSON anterior', async function(t) {
  const workspace = await createTestWorkspace(t);
  const previousContents = '{"valid":true}\n';
  await fs.writeFile(workspace.outputPath, previousContents, 'utf8');
  await createWorkbookFixture(workspace.workbookPath, function(workbook) {
    workbook.getWorksheet('Productos').getCell('G2').value = -1;
  });

  const result = await runFixture(workspace);

  assert.equal(result.exitCode, 1);
  assert.equal(
    await fs.readFile(workspace.outputPath, 'utf8'),
    previousContents
  );
});

test('dos importaciones iguales generan JSON idéntico', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath);

  const firstResult = await runFixture(workspace);
  assert.equal(firstResult.exitCode, 0);
  const first = await fs.readFile(workspace.outputPath);

  const secondOutput = path.join(workspace.directory, 'catalog-2.json');
  const secondResult = await runFixture({
    ...workspace,
    outputPath: secondOutput
  });
  assert.equal(secondResult.exitCode, 0);
  const second = await fs.readFile(secondOutput);

  assert.deepEqual(first, second);
  assert.equal(first.at(-1), 10);
});

test('--strict convierte advertencias en fallo', async function(t) {
  const workspace = await createTestWorkspace(t);
  await createWorkbookFixture(workspace.workbookPath);

  const result = await runFixture(workspace, {
    strict: true
  });

  assert.equal(result.exitCode, 1);
  assert.equal(result.diagnostics.errors.length, 0);
  await assert.rejects(fs.access(workspace.outputPath));
});
