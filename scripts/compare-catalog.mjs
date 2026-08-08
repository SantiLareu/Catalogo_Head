import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  compareCatalogFiles,
  formatCatalogDifference
} from './catalog-import/catalogBaseline.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');

export async function runCatalogComparison(options = {}) {
  const catalogPath = path.resolve(
    options.catalogPath || path.join(repoRoot, 'generated', 'catalog.json')
  );
  const baselinePath = path.resolve(
    options.baselinePath ||
    path.join(repoRoot, 'tests', 'fixtures', 'catalog-baseline.json')
  );

  try {
    const result = await compareCatalogFiles({ baselinePath, catalogPath });
    return { ...result, baselinePath, catalogPath, exitCode: result.differences.length ? 1 : 0 };
  } catch (error) {
    return { baselinePath, catalogPath, exitCode: 1, error, differences: [] };
  }
}

async function main() {
  const result = await runCatalogComparison();
  if (result.error) {
    console.error(result.error.message);
  } else if (result.differences.length) {
    console.error(
      'El catálogo difiere del snapshot canónico (' +
      result.differences.length + ' diferencia(s)):'
    );
    result.differences.forEach(function(difference) {
      console.error('- ' + formatCatalogDifference(difference));
    });
  } else {
    const counts = result.counts;
    console.log(
      'Comparación canónica: OK (' +
      counts.products + ' productos, ' +
      counts.variants + ' variantes, ' +
      counts.stock + ' stocks, ' +
      counts.images + ' imágenes, ' +
      counts.specifications + ' características).'
    );
  }
  process.exitCode = result.exitCode;
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) await main();

