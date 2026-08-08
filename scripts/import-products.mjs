import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  buildCatalog,
  serializeCatalog
} from './catalog-import/buildCatalog.mjs';
import {
  createCatalogVersionContents
} from './catalog-import/catalogVersion.mjs';
import {
  compareCatalogs,
  formatCatalogDifference,
  readCatalogFile
} from './catalog-import/catalogBaseline.mjs';
import {
  Diagnostics,
  generalLocation
} from './catalog-import/diagnostics.mjs';
import { readWorkbook } from './catalog-import/readWorkbook.mjs';
import { validateWorkbookData } from './catalog-import/validateWorkbook.mjs';
import { writeOutputsSafely } from './catalog-import/writeOutput.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = path.resolve(scriptDirectory, '..');

function parseArguments(argv, repoRoot) {
  const options = {
    inputPath: null,
    outputPath: path.join(repoRoot, 'generated', 'catalog.json'),
    versionOutputPath: null,
    repoRoot,
    check: false,
    strict: false,
    verifyOutput: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === '--check') {
      options.check = true;
    } else if (argument === '--strict') {
      options.strict = true;
    } else if (argument === '--output') {
      index += 1;
      options.outputPath = path.resolve(repoRoot, argv[index]);
    } else if (argument.startsWith('--')) {
      throw new Error('Argumento desconocido: ' + argument);
    } else if (!options.inputPath) {
      options.inputPath = path.resolve(repoRoot, argument);
    } else {
      throw new Error('Solo se admite un archivo Excel de entrada.');
    }
  }

  if (!options.inputPath) {
    options.inputPath = path.join(repoRoot, 'catalog', 'products.xlsx');
  }

  options.versionOutputPath = path.join(
    path.dirname(options.outputPath),
    path.basename(options.outputPath, path.extname(options.outputPath)) +
      '-version.json'
  );

  return options;
}

export async function runImport(options) {
  const diagnostics = new Diagnostics();
  const inputPath = path.resolve(options.inputPath);
  const outputPath = path.resolve(options.outputPath);
  const versionOutputPath = path.resolve(
    options.versionOutputPath || path.join(
      path.dirname(outputPath),
      path.basename(outputPath, path.extname(outputPath)) + '-version.json'
    )
  );
  const repoRoot = path.resolve(options.repoRoot || defaultRepoRoot);
  const strict = Boolean(options.strict);
  let catalog = null;
  let counts = null;
  let comparison = null;
  let catalogContents = null;
  let catalogVersionContents = null;

  try {
    await fs.access(inputPath);
  } catch (error) {
    diagnostics.error(
      generalLocation('Workbook'),
      'INPUT_NOT_FOUND',
      'No existe el archivo "' + inputPath + '".'
    );
  }

  if (!diagnostics.errors.length) {
    const readResult = await readWorkbook(inputPath, diagnostics);

    if (readResult.workbook) {
      counts = await validateWorkbookData(
        readResult.sheets,
        diagnostics,
        {
          repoRoot
        }
      );

      if (!diagnostics.errors.length) {
        catalog = buildCatalog(readResult.sheets);
        catalogContents = serializeCatalog(catalog);
        catalogVersionContents = createCatalogVersionContents(catalogContents);

        if (options.check || options.verifyOutput) {
          try {
            const currentContents = await fs.readFile(outputPath, 'utf8');
            const currentOutput = await readCatalogFile(
              outputPath,
              'generated/catalog.json'
            );
            const differences = compareCatalogs(currentOutput, catalog);
            comparison = { differences };
            if (currentContents !== catalogContents) {
              diagnostics.error(
                generalLocation('Comparacion JSON'),
                'GENERATED_CATALOG_MISMATCH',
                differences.length
                  ? formatCatalogDifference(differences[0])
                  : 'generated/catalog.json no usa la serialización canónica esperada.'
              );
            }
          } catch (error) {
            diagnostics.error(
              generalLocation('Comparacion JSON'),
              'GENERATED_CATALOG_INVALID',
              error.message
            );
          }

          try {
            const currentVersionContents = await fs.readFile(
              versionOutputPath,
              'utf8'
            );
            if (currentVersionContents !== catalogVersionContents) {
              diagnostics.error(
                generalLocation('Comparacion version'),
                'GENERATED_CATALOG_VERSION_MISMATCH',
                'generated/catalog-version.json no corresponde al catálogo actual.'
              );
            }
          } catch (error) {
            diagnostics.error(
              generalLocation('Comparacion version'),
              'GENERATED_CATALOG_VERSION_INVALID',
              error.code === 'ENOENT'
                ? 'No existe generated/catalog-version.json.'
                : 'No se pudo leer generated/catalog-version.json: ' + error.message
            );
          }
        }
      }
    }
  }

  const failed = diagnostics.hasErrors(strict);

  if (!failed && !options.check) {
    await writeOutputsSafely([
      { path: outputPath, contents: catalogContents },
      { path: versionOutputPath, contents: catalogVersionContents }
    ]);
  }

  return {
    exitCode: failed ? 1 : 0,
    diagnostics,
    catalog,
    counts,
    comparison,
    inputPath,
    outputPath,
    versionOutputPath,
    wroteOutput: !failed && !options.check
  };
}

function printResult(result, options) {
  if (result.diagnostics.items.length) {
    console.log(result.diagnostics.formatAll());
    console.log('');
  }

  const summary = result.diagnostics.summary();

  console.log(
    'Resumen: ' +
    summary.errors + ' error(es), ' +
    summary.warnings + ' advertencia(s).'
  );

  if (result.counts) {
    console.log(
      'Filas: ' +
      result.counts.products + ' productos, ' +
      result.counts.variants + ' variantes, ' +
      result.counts.images + ' imágenes, ' +
      result.counts.stock + ' stocks, ' +
      result.counts.specifications + ' características.'
    );
  }

  if (result.comparison && !result.comparison.differences.length) {
    console.log('Comparación con generated/catalog.json: OK.');
  }

  if (result.wroteOutput) {
    console.log(
      'JSON generado: ' +
      path.relative(options.repoRoot, result.outputPath)
    );
    console.log(
      'Versión generada: ' +
      path.relative(options.repoRoot, result.versionOutputPath)
    );
  } else if (options.check && result.exitCode === 0) {
    console.log('Validación completada en modo --check.');
  }
}

async function main() {
  let options;

  try {
    options = parseArguments(process.argv.slice(2), defaultRepoRoot);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
    return;
  }

  const result = await runImport(options);
  printResult(result, options);
  process.exitCode = result.exitCode;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  await main();
}
