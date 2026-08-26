import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveProductImageDerivativeUrl } from '../../src/data/productImageDerivativePaths.js';

const readSource = (relativePath) => readFile(
  new URL(`../../${relativePath}`, import.meta.url),
  'utf8'
);

test('ProductCard resuelve originales y derivados sin alterar la selección de variantes', async () => {
  const [card, resolver, variantSelector] = await Promise.all([
    readSource('src/components/product/ProductCard.jsx'),
    readSource('src/data/productImages.js'),
    readSource('src/components/product/VariantSelector.jsx')
  ]);
  assert.match(card, /\.map\(\(imagePath\) => resolveProductImageSources\(imagePath\)\)/);
  assert.doesNotMatch(card, /\.map\(resolveProductImageSources\)/);
  assert.match(resolver, /if \(!original\) return null/);
  assert.match(resolver, /const thumbnail = resolveVariant\(200\) \|\| original/);
  assert.match(resolver, /card: medium \|\| small \|\| original/);
  assert.match(variantSelector, /resolveProductImageSources\(variant\.thumbnail\)\?\.thumbnail/);
});

test('resolver derivados acepta bases web relativas sin lanzar Invalid base URL', () => {
  const derivative = 'product-images/tenis/Raqueta Niño (26) + azul.jpg.w200.webp';
  const documentBase = 'https://example.test/catalogo/index.html#tenis';

  assert.doesNotThrow(() => resolveProductImageDerivativeUrl(derivative, '/', documentBase));
  assert.equal(
    resolveProductImageDerivativeUrl(derivative, '/', documentBase),
    'https://example.test/product-images/tenis/Raqueta%20Ni%C3%B1o%20(26)%20+%20azul.jpg.w200.webp'
  );
  assert.equal(
    resolveProductImageDerivativeUrl(derivative, './', documentBase),
    'https://example.test/catalogo/product-images/tenis/Raqueta%20Ni%C3%B1o%20(26)%20+%20azul.jpg.w200.webp'
  );
  assert.equal(
    resolveProductImageDerivativeUrl(derivative, '/catalogo/', documentBase),
    'https://example.test/catalogo/product-images/tenis/Raqueta%20Ni%C3%B1o%20(26)%20+%20azul.jpg.w200.webp'
  );
});

test('galería normal usa srcset y sizes coherentes sin perder lazy ni prioridad selectiva', async () => {
  const gallery = await readSource('src/components/product/ProductGallery.jsx');
  assert.match(gallery, /src=\{images\[imageIndex\]\.card\}/);
  assert.match(gallery, /srcSet=\{images\[imageIndex\]\.srcSet\}/);
  assert.match(gallery, /max-width: 768px[\s\S]*100vw - 48px/);
  assert.match(gallery, /max-width: 980px[\s\S]*92vw - 48px/);
  assert.match(gallery, /760px/);
  assert.match(gallery, /loading="lazy"/);
  assert.doesNotMatch(gallery, /loading="eager"/);
  assert.doesNotMatch(gallery, /fetchPriority="high"/);
});

test('ThumbnailRail usa el derivado pequeño y permanece lazy', async () => {
  const thumbnails = await readSource('src/components/product/ThumbnailRail.jsx');
  assert.match(thumbnails, /src=\{image\.thumbnail\}/);
  assert.match(thumbnails, /loading="lazy"/);
  assert.doesNotMatch(thumbnails, /src=\{image\.original\}/);
  assert.doesNotMatch(thumbnails, /loading="eager"/);
});

test('Lightbox solicita el original sólo cuando se monta', async () => {
  const [card, lightbox] = await Promise.all([
    readSource('src/components/product/ProductCard.jsx'),
    readSource('src/components/lightbox/Lightbox.jsx')
  ]);
  assert.match(card, /\{lightboxOpen && images\.length > 0 \? \(/);
  assert.match(lightbox, /src=\{images\[imageIndex\]\.original\}/);
  assert.doesNotMatch(lightbox, /srcSet=/);
});

test('no introduce eager global y conserva la promoción dinámica existente', async () => {
  const [gallery, thumbnails, navigation] = await Promise.all([
    readSource('src/components/product/ProductGallery.jsx'),
    readSource('src/components/product/ThumbnailRail.jsx'),
    readSource('src/utils/navigation.js')
  ]);
  assert.doesNotMatch(`${gallery}\n${thumbnails}`, /loading="eager"/);
  assert.match(navigation, /image\.loading = 'eager'/);
  assert.match(navigation, /image\.fetchPriority = 'high'/);
});
