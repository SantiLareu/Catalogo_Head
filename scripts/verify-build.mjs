#!/usr/bin/env node
// Script de verificación post-build.
// Verifica que dist/ contiene lo necesario para servir el catálogo de forma
// autónoma. Corre después de `npm run build` (o `npm run react:build:signed`).
//
// Salida: exit code 0 si OK, 1 si hay problemas.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');
const dist = path.join(repoRoot, 'dist');

const MIN_PRODUCT_IMAGES = 300;
const MIN_LOGO_BYTES = 1000;
const MIN_HERO_BYTES = 10000;

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
  console.error(`✗ ${message}`);
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  warnings.push(message);
  console.warn(`⚠ ${message}`);
}

function exists(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function findFirstMatching(directory, regex) {
  if (!fs.existsSync(directory)) return null;
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (regex.test(entry.name)) return path.join(directory, entry.name);
  }
  return null;
}

console.log('=== VERIFICACIÓN POST-BUILD ===');
console.log(`dist/: ${dist}\n`);

// 1. dist/ existe
if (!exists(dist)) {
  fail('dist/ no existe. Ejecutá `npm run build` antes.');
  process.exit(1);
}
pass('dist/ existe');

// 2. index.html existe
if (!exists(path.join(dist, 'index.html'))) {
  fail('dist/index.html no existe');
} else {
  pass('dist/index.html existe');
}

// 3. catalog.json existe
const catalogPath = path.join(dist, 'catalog.json');
const catalogVersionPath = path.join(dist, 'catalog-version.json');
const appVersionPath = path.join(dist, 'app-version.json');
if (!exists(catalogPath)) {
  fail('dist/catalog.json no existe');
} else {
  pass('dist/catalog.json existe');
}

// 4. catalog-version.json existe y corresponde a los bytes publicados
if (!exists(catalogVersionPath)) {
  fail('dist/catalog-version.json no existe');
} else {
  pass('dist/catalog-version.json existe');
  try {
    const manifest = JSON.parse(fs.readFileSync(catalogVersionPath, 'utf8'));
    const catalogBytes = fs.readFileSync(catalogPath);
    const expectedVersion = 'sha256-' + crypto
      .createHash('sha256')
      .update(catalogBytes)
      .digest('hex');
    if (
      manifest.schemaVersion !== 1 ||
      manifest.catalogFile !== 'catalog.json' ||
      manifest.version !== expectedVersion
    ) {
      fail('dist/catalog-version.json no corresponde exactamente a dist/catalog.json');
    } else {
      pass('dist/catalog-version.json corresponde exactamente a dist/catalog.json');
    }
  } catch (error) {
    fail('dist/catalog-version.json no es válido: ' + error.message);
  }
}

// 4b. app-version.json identifica el build cargado y sus entrypoints listos
if (!exists(appVersionPath)) {
  fail('dist/app-version.json no existe');
} else {
  pass('dist/app-version.json existe');
  try {
    const manifest = JSON.parse(fs.readFileSync(appVersionPath, 'utf8'));
    const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
    if (
      manifest.schemaVersion !== 1 ||
      !/^sha256-[a-f0-9]{64}$/.test(manifest.version) ||
      !Array.isArray(manifest.files) ||
      manifest.files.length === 0 ||
      !indexHtml.includes(`name="realstep-app-version" content="${manifest.version}"`)
    ) {
      fail('dist/app-version.json no coincide con la versión embebida en index.html');
    } else {
      let validFiles = true;
      for (const file of manifest.files) {
        const filePath = path.resolve(dist, file.path);
        const relative = path.relative(dist, filePath);
        if (relative.startsWith('..') || path.isAbsolute(relative) || !exists(filePath)) {
          validFiles = false;
          break;
        }
        const contents = fs.readFileSync(filePath);
        if (
          contents.length !== file.size ||
          crypto.createHash('sha256').update(contents).digest('hex') !== file.sha256
        ) {
          validFiles = false;
          break;
        }
      }
      if (validFiles) pass('dist/app-version.json corresponde a los entrypoints publicados');
      else fail('dist/app-version.json referencia entrypoints ausentes o incorrectos');
    }
  } catch (error) {
    fail('dist/app-version.json no es válido: ' + error.message);
  }
}

// 5. assets/ existe y no está vacío
const assetsDir = path.join(dist, 'assets');
const assetsStat = exists(assetsDir);
if (!assetsStat || !assetsStat.isDirectory()) {
  fail('dist/assets/ no existe o no es un directorio');
} else {
  pass('dist/assets/ existe');
  const assetFiles = fs.readdirSync(assetsDir);
  if (assetFiles.length === 0) {
    fail('dist/assets/ está vacío');
  } else {
    pass(`dist/assets/ contiene ${assetFiles.length} archivos`);
  }
}

// 6. Conteo de imágenes de productos
if (exists(assetsDir)) {
  const isImage = (name) => /\.(jpe?g|png|webp)$/i.test(name);
  const images = fs.readdirSync(assetsDir).filter(isImage);
  // Excluir el favicon (siempre png grande con "ChatGPT" en el nombre) y los
  // assets fijos (logo, hero) que tienen su propia verificación.
  const productImages = images.filter((name) =>
    !/^(Real_Step_logo|2026-padel-coello-heroHeader|ChatGPT Image)/.test(name)
  );
  if (productImages.length < MIN_PRODUCT_IMAGES) {
    fail(
      `dist/assets/ contiene ${productImages.length} imágenes de productos; ` +
      `se esperan al menos ${MIN_PRODUCT_IMAGES}. ` +
      `Esto sugiere que el glob de productImages.js perdió un nivel de profundidad.`
    );
  } else {
    pass(`dist/assets/ contiene ${productImages.length} imágenes de productos (>= ${MIN_PRODUCT_IMAGES})`);
  }
}

// 7. Logo bundleado
if (exists(assetsDir)) {
  const logo = findFirstMatching(assetsDir, /^Real_Step_logo.*\.(jpe?g|png|webp)$/);
  if (!logo) {
    fail('dist/assets/ no contiene el logo (Real_Step_logo*)');
  } else {
    const size = fs.statSync(logo).size;
    if (size < MIN_LOGO_BYTES) {
      fail(`logo en dist parece corrupto: ${size} bytes (< ${MIN_LOGO_BYTES})`);
    } else {
      pass(`logo bundleado: ${path.basename(logo)} (${size} bytes)`);
    }
  }
}

// 8. Hero bundleado
if (exists(assetsDir)) {
  const hero = findFirstMatching(assetsDir, /^2026-padel-coello-heroHeader.*\.(jpe?g|png|webp)$/);
  if (!hero) {
    fail('dist/assets/ no contiene el hero (2026-padel-coello-heroHeader*)');
  } else {
    const size = fs.statSync(hero).size;
    if (size < MIN_HERO_BYTES) {
      fail(`hero en dist parece corrupto: ${size} bytes (< ${MIN_HERO_BYTES})`);
    } else {
      pass(`hero bundleado: ${path.basename(hero)} (${size} bytes)`);
    }
  }
}

// 9. Verificar que el bundle JS no depende de paths relativos problemáticos
//    para assets. Si Vite dejó advertencias, las URLs quedan como literales
//    que no resuelven en runtime.
if (exists(assetsDir)) {
  const jsFile = findFirstMatching(assetsDir, /^index-.*\.js$/);
  if (jsFile) {
    const bundle = fs.readFileSync(jsFile, 'utf8');
    // "doesn't exist at build time" es un patrón de warning de Vite; no
    // debería aparecer en un bundle sano.
    if (bundle.includes("doesn't exist at build time")) {
      fail('el bundle JS contiene el texto "doesn\'t exist at build time" (Vite no resolvió assets)');
    } else {
      pass('el bundle JS no contiene rastros de warnings de assets no resueltos');
    }
  }
}

// 10. Resumen
console.log('\n=== RESUMEN ===');
if (errors.length === 0) {
  console.log(`✓ Todas las verificaciones críticas pasaron${warnings.length ? ` (${warnings.length} advertencias)` : ''}.`);
  if (warnings.length) {
    warnings.forEach((w) => console.warn(`  ⚠ ${w}`));
  }
  process.exit(0);
} else {
  console.error(`✗ ${errors.length} error(es) crítico(s).`);
  errors.forEach((e) => console.error(`  ✗ ${e}`));
  process.exit(1);
}
