import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  compareLegacyToCatalog
} from './catalog-import/compareCatalogs.mjs';
import { Diagnostics } from './catalog-import/diagnostics.mjs';
import { loadLegacyCatalog } from './catalog-import/loadLegacyCatalog.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');
const jsonPath = path.join(repoRoot, 'generated', 'catalog.json');
const diagnostics = new Diagnostics();

let catalog;

try {
  catalog = JSON.parse(await fs.readFile(jsonPath, 'utf8'));
} catch (error) {
  console.error('No se pudo leer generated/catalog.json: ' + error.message);
  process.exitCode = 1;
}

if (catalog) {
  const legacy = await loadLegacyCatalog(repoRoot);
  const result = compareLegacyToCatalog(
    legacy,
    catalog,
    diagnostics
  );

  if (diagnostics.items.length) {
    console.log(diagnostics.formatAll());
    console.log('');
  }

  if (diagnostics.errors.length) {
    console.log(
      'Comparación fallida: ' +
      diagnostics.errors.length + ' diferencia(s).'
    );
    process.exitCode = 1;
  } else {
    console.log(
      'Comparación legacy: OK (' +
      result.counts.products + ' productos, ' +
      result.counts.variants + ' variantes, ' +
      result.counts.stock + ' stocks, ' +
      result.counts.images + ' imágenes).'
    );
  }
}
