import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildProductSearchIndex,
  getNextSearchResultIndex,
  normalizeSearchText,
  searchProducts
} from '../../src/data/productSearch.js';

const categories = [{
  id: 'indumentaria',
  label: 'INDUMENTARIA',
  title: 'Indumentaria',
  target: 'categoria-indumentaria',
  enabled: true,
  order: 0,
  filter: { category: 'indumentaria', subcategory: null, gender: null },
  children: [{
    id: 'remeras',
    label: 'REMERAS',
    title: 'Remeras técnicas',
    target: 'categoria-remeras',
    enabled: true,
    order: 0,
    filter: { category: 'indumentaria', subcategory: 'remeras', gender: null }
  }]
}];
const products = [
  {
    id: ' radical-1 ',
    name: 'Rádical Pro',
    code: '226145',
    category: 'indumentaria',
    subcategory: 'remeras',
    gender: 'hombre',
    order: 2,
    variants: [{ id: 'azul ', colorName: 'Azúl profundo', code: 'SKU-VIBE-9' }]
  },
  {
    id: 'medias-2',
    name: 'Medias Performance',
    code: null,
    category: 'indumentaria',
    subcategory: 'remeras',
    order: 1,
    variants: []
  }
];
const index = buildProductSearchIndex(products, categories);

test('normaliza mayúsculas, tildes y espacios sin alterar IDs originales', () => {
  assert.equal(normalizeSearchText('  RÁDICAL   Pró  '), 'radical pro');
  assert.equal(index[0].productId, ' radical-1 ');
  assert.equal(searchProducts(index, 'RADICAL')[0].productId, ' radical-1 ');
});

test('encuentra por nombre, código general, variante y categoría', () => {
  assert.equal(searchProducts(index, 'pro')[0].productId, ' radical-1 ');
  assert.equal(searchProducts(index, '226145')[0].productId, ' radical-1 ');
  assert.equal(searchProducts(index, 'vibe-9')[0].productId, ' radical-1 ');
  assert.equal(searchProducts(index, 'azul profundo')[0].productId, ' radical-1 ');
  assert.equal(searchProducts(index, 'remeras').length, 2);
  assert.equal(searchProducts(index, 'hombre')[0].productId, ' radical-1 ');
});

test('acepta términos parciales y espacios adicionales', () => {
  assert.equal(searchProducts(index, '  med   perf ')[0].productId, 'medias-2');
});

test('consulta vacía y consulta desconocida no devuelven resultados', () => {
  assert.deepEqual(searchProducts(index, '   '), []);
  assert.deepEqual(searchProducts(index, 'producto inexistente'), []);
});

test('el orden es determinista y prioriza coincidencias exactas o iniciales', () => {
  const first = searchProducts(index, 'medias').map(({ productId }) => productId);
  const second = searchProducts(index, 'medias').map(({ productId }) => productId);
  assert.deepEqual(first, second);
  assert.equal(first[0], 'medias-2');
});

test('flechas recorren resultados de forma circular y segura', () => {
  assert.equal(getNextSearchResultIndex(-1, 'ArrowDown', 3), 0);
  assert.equal(getNextSearchResultIndex(0, 'ArrowUp', 3), 2);
  assert.equal(getNextSearchResultIndex(2, 'ArrowDown', 3), 0);
  assert.equal(getNextSearchResultIndex(1, 'Enter', 3), 1);
  assert.equal(getNextSearchResultIndex(0, 'ArrowDown', 0), -1);
});

test('el catálogo real se indexa y encuentra nombre y código de variante', async () => {
  const catalog = JSON.parse(await readFile(
    new URL('../../generated/catalog.json', import.meta.url),
    'utf8'
  ));
  const realIndex = buildProductSearchIndex(catalog.products, catalog.categories);
  const namedProduct = catalog.products.find((product) =>
    product.enabled !== false && typeof product.name === 'string' && product.name.trim()
  );
  const productWithCodedVariant = catalog.products.find((product) =>
    product.enabled !== false && product.variants.some((variant) =>
      typeof variant.code === 'string' && variant.code.trim() && variant.code !== 'PENDIENTE'
    )
  );
  const codedVariant = productWithCodedVariant.variants.find((variant) =>
    typeof variant.code === 'string' && variant.code.trim() && variant.code !== 'PENDIENTE'
  );

  assert.ok(namedProduct, 'El catálogo debe contener al menos un producto buscable por nombre.');
  assert.ok(productWithCodedVariant, 'El catálogo debe contener una variante con código buscable.');
  assert.ok(
    searchProducts(realIndex, namedProduct.name)
      .some((result) => result.productId === namedProduct.id)
  );
  assert.ok(
    searchProducts(realIndex, codedVariant.code)
      .some((result) => result.productId === productWithCodedVariant.id)
  );
});
