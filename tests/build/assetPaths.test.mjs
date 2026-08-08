// Test de regresión: previene paths incorrectos en el código fuente del frontend
// que rompan el bundling de assets. Esta regresión se introdujo en el refactor
// estructural (3 paths con un nivel de profundidad heredado del layout anterior).
//
// Verifica:
//   1. src/data/productImages.js usa el patrón import.meta.glob correcto (2 niveles)
//   2. src/components/layout/Header.jsx usa el path del logo correcto (3 niveles)
//   3. src/components/layout/Hero.jsx usa el path del hero correcto (3 niveles)
//   4. Los assets referenciados existen físicamente en el repo
//   5. Los assets referenciados tienen suficiente contenido para ser imágenes válidas

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

const PRODUCT_IMAGES_FILE = path.join(repoRoot, 'src/data/productImages.js');
const HEADER_FILE = path.join(repoRoot, 'src/components/layout/Header.jsx');
const HERO_FILE = path.join(repoRoot, 'src/components/layout/Hero.jsx');

const LOGO_PATH = path.join(repoRoot, 'assets/Real_Step_logo.jpeg');
const HERO_PATH = path.join(repoRoot, 'assets/2026-padel-coello-heroHeader.jpg');
const PRODUCTS_DIR = path.join(repoRoot, 'assets/products');

function readSource(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function resolveRelative(fromFile, relativePath) {
  const fromDir = path.dirname(fromFile);
  return path.resolve(fromDir, relativePath);
}

test('src/data/productImages.js: el glob no debe usar un nivel de más', () => {
  const source = readSource(PRODUCT_IMAGES_FILE);
  const globMatch = source.match(/import\.meta\.glob\(\s*['"]([^'"]+)['"]/);
  assert.ok(globMatch, 'debe declarar un import.meta.glob con un patrón string');

  const pattern = globMatch[1];
  // El archivo vive en src/data/. La raíz lógica es repoRoot. Para llegar a
  // assets/products/ se necesitan exactamente 2 niveles: ../../
  const upLevels = (pattern.match(/^(\.\.\/)+/g) || [''])[0].split('/').filter(Boolean).length;
  assert.equal(
    upLevels,
    2,
    `el patrón "${pattern}" usa ${upLevels} niveles hacia arriba; deben ser 2 ` +
    `(src/data/ -> src/ -> raiz/ para llegar a assets/products/). ` +
    `Un nivel de más hace que Vite no bundlee las imágenes de productos.`
  );
});

test('src/data/productImages.js: el glob resuelto apunta a assets/products/', () => {
  const source = readSource(PRODUCT_IMAGES_FILE);
  const globMatch = source.match(/import\.meta\.glob\(\s*['"]([^'"]+)['"]/);
  assert.ok(globMatch, 'debe declarar un import.meta.glob con un patrón string');
  const pattern = globMatch[1];
  const resolved = resolveRelative(PRODUCT_IMAGES_FILE, pattern.split('/**')[0]);

  assert.equal(
    path.normalize(resolved),
    path.normalize(PRODUCTS_DIR),
    `el glob resuelve a "${resolved}" pero debería resolver a "${PRODUCTS_DIR}"`
  );
});

test('src/data/productImages.js: la función resolveProductImage usa el mismo nivel de prefijo', () => {
  // Coherencia: el glob agrupa rutas con prefijo "../../" y la lookup debe usar
  // el mismo prefijo. Si cambia uno sin el otro, todas las imágenes resuelven
  // a null en runtime.
  const source = readSource(PRODUCT_IMAGES_FILE);
  const lookupMatch = source.match(/productImageUrls\[`([.\/]+)/);
  assert.ok(lookupMatch, 'la función resolveProductImage debe consultar el map con un prefijo');

  const prefix = lookupMatch[1];
  assert.ok(
    prefix.startsWith('../../') && !prefix.startsWith('../../../'),
    `el prefijo de lookup "${prefix}" debe coincidir con el prefijo del glob (../../).`
  );
});

test('src/components/layout/Header.jsx: el logo usa 3 niveles de profundidad', () => {
  const source = readSource(HEADER_FILE);
  const logoMatch = source.match(/new URL\(\s*['"]([^'"]+)['"]/);
  assert.ok(logoMatch, 'Header.jsx debe declarar una URL para el logo');

  const pattern = logoMatch[1];
  const upLevels = (pattern.match(/^(\.\.\/)+/g) || [''])[0].split('/').filter(Boolean).length;
  assert.equal(
    upLevels,
    3,
    `el path del logo "${pattern}" usa ${upLevels} niveles; deben ser 3 ` +
    `(src/components/layout/ -> src/components/ -> src/ -> raiz/ para llegar a assets/).`
  );
});

test('src/components/layout/Header.jsx: el logo resuelve al archivo real', () => {
  const source = readSource(HEADER_FILE);
  const logoMatch = source.match(/new URL\(\s*['"]([^'"]+)['"]/);
  const resolved = resolveRelative(HEADER_FILE, logoMatch[1]);

  assert.equal(
    path.normalize(resolved),
    path.normalize(LOGO_PATH),
    `el logo resuelve a "${resolved}" pero debería resolver a "${LOGO_PATH}"`
  );
});

test('src/components/layout/Hero.jsx: el hero usa 3 niveles de profundidad', () => {
  const source = readSource(HERO_FILE);
  const heroMatch = source.match(/new URL\(\s*['"]([^'"]+)['"]/);
  assert.ok(heroMatch, 'Hero.jsx debe declarar una URL para el hero');

  const pattern = heroMatch[1];
  const upLevels = (pattern.match(/^(\.\.\/)+/g) || [''])[0].split('/').filter(Boolean).length;
  assert.equal(
    upLevels,
    3,
    `el path del hero "${pattern}" usa ${upLevels} niveles; deben ser 3.`
  );
});

test('src/components/layout/Hero.jsx: el hero resuelve al archivo real', () => {
  const source = readSource(HERO_FILE);
  const heroMatch = source.match(/new URL\(\s*['"]([^'"]+)['"]/);
  const resolved = resolveRelative(HERO_FILE, heroMatch[1]);

  assert.equal(
    path.normalize(resolved),
    path.normalize(HERO_PATH),
    `el hero resuelve a "${resolved}" pero debería resolver a "${HERO_PATH}"`
  );
});

test('assets/products/ existe y contiene imágenes', () => {
  assert.ok(fs.existsSync(PRODUCTS_DIR), `debe existir ${PRODUCTS_DIR}`);
  const files = fs.readdirSync(PRODUCTS_DIR, { recursive: true });
  const images = files.filter((name) => /\.(jpe?g|png|webp)$/i.test(name));
  assert.ok(
    images.length > 100,
    `assets/products/ debe contener más de 100 imágenes; contiene ${images.length}`
  );
});

test('el logo existe y tiene un tamaño razonable', () => {
  assert.ok(fs.existsSync(LOGO_PATH), `debe existir ${LOGO_PATH}`);
  const stat = fs.statSync(LOGO_PATH);
  assert.ok(stat.size > 1000, `el logo debe pesar más de 1KB; pesa ${stat.size} bytes`);
});

test('el hero existe y tiene un tamaño razonable', () => {
  assert.ok(fs.existsSync(HERO_PATH), `debe existir ${HERO_PATH}`);
  const stat = fs.statSync(HERO_PATH);
  assert.ok(stat.size > 10000, `el hero debe pesar más de 10KB; pesa ${stat.size} bytes`);
});
