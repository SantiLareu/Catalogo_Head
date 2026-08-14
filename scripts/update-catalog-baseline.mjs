import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { runImport } from './import-products.mjs';
import {
  compareCatalogs,
  countCatalog,
  readCatalogFile,
  updateCatalogBaseline
} from './catalog-import/catalogBaseline.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');

export async function runBaselineUpdate(options = {}) {
  if (!options.dryRun && options.confirm !== true) {
    throw new Error(
      'La actualización del baseline requiere confirmación explícita.'
    );
  }

  const root = path.resolve(options.repoRoot || repoRoot);
  const inputPath = path.resolve(
    options.inputPath || path.join(root, 'catalog', 'products.xlsx')
  );
  const catalogPath = path.resolve(
    options.catalogPath || path.join(root, 'generated', 'catalog.json')
  );
  const baselinePath = path.resolve(
    options.baselinePath ||
    path.join(root, 'tests', 'fixtures', 'catalog-baseline.json')
  );
  const validation = await runImport({
    inputPath,
    outputPath: catalogPath,
    repoRoot: root,
    check: true,
    strict: false,
    verifyOutput: true
  });

  if (validation.exitCode !== 0) {
    return { exitCode: 1, validation, baselinePath };
  }

  const generated = await readCatalogFile(catalogPath, 'el catálogo generado');
  const differences = compareCatalogs(validation.catalog, generated);
  if (differences.length) {
    return { exitCode: 1, validation, baselinePath, differences };
  }

  const counts = countCatalog(generated);
  if (options.dryRun) {
    return { exitCode: 0, validation, baselinePath, counts, wroteBaseline: false };
  }

  await updateCatalogBaseline({
    baselinePath,
    catalog: generated,
    confirm: options.confirm === true
  });
  return { exitCode: 0, validation, baselinePath, counts, wroteBaseline: true };
}

async function main() {
  console.log(
    'ATENCIÓN: este comando reemplaza el snapshot canónico y solo debe ' +
    'usarse después de aprobar un cambio comercial.'
  );

  if (!process.argv.slice(2).includes('--confirm')) {
    console.error(
      'No se actualizó el baseline: falta confirmación explícita. ' +
      'Ejecutá npm run update-catalog-baseline -- --confirm para aprobarlo.'
    );
    process.exitCode = 1;
    return;
  }

  const preview = await runBaselineUpdate({ dryRun: true });
  if (preview.exitCode !== 0) {
    console.error(
      'No se actualizó el baseline: el Excel y generated/catalog.json ' +
      'deben ser válidos e idénticos.'
    );
  } else {
    const counts = preview.counts;
    console.log(
      'Resumen que se escribirá: ' +
      counts.products + ' productos, ' +
      counts.variants + ' variantes, ' +
      counts.stock + ' stocks, ' +
      counts.images + ' imágenes, ' +
      counts.specifications + ' características.'
    );
    const result = await runBaselineUpdate({ confirm: true });
    console.log('Snapshot actualizado: ' + result.baselinePath);
  }
  process.exitCode = preview.exitCode;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) await main();
