import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { runImport } from '../../scripts/import-products.mjs';

export const repoRoot = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')),
  '..',
  '..'
);
export const validWorkbookPath = path.join(
  repoRoot,
  'catalog',
  'products.xlsx'
);

export async function createTestWorkspace(t) {
  const directory = await fs.mkdtemp(
    path.join(os.tmpdir(), 'realstep-importer-')
  );

  t.after(async function() {
    await fs.rm(directory, {
      recursive: true,
      force: true
    });
  });

  return {
    directory,
    workbookPath: path.join(directory, 'products.xlsx'),
    outputPath: path.join(directory, 'catalog.json')
  };
}

export async function createWorkbookFixture(
  targetPath,
  mutate
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(validWorkbookPath);

  if (mutate) {
    await mutate(workbook);
  }

  await workbook.xlsx.writeFile(targetPath);
}

export async function runFixture(workspace, options = {}) {
  return runImport({
    inputPath: workspace.workbookPath,
    outputPath: workspace.outputPath,
    repoRoot,
    check: Boolean(options.check),
    strict: Boolean(options.strict),
    compareLegacy: Boolean(options.compareLegacy)
  });
}

export function diagnosticCodes(result) {
  return result.diagnostics.items.map(function(item) {
    return item.code;
  });
}
