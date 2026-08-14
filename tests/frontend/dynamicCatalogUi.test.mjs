import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildCatalogSections, getProductsForCategory } from '../../src/data/catalogSelectors.js';
import { buildProductSearchIndex, searchProducts } from '../../src/data/productSearch.js';
import {
  productSelectionActions as actions,
  productSelectionReducer
} from '../../src/hooks/productSelectionReducer.js';
import {
  getShortCatalogVersion,
  shouldNotifyCatalogUpdate
} from '../../src/utils/catalogVersion.js';

const categories = [{
  id: 'calzado',
  label: 'CALZADO',
  order: 0,
  filter: { category: 'shoes' }
}];
const product = (overrides = {}) => ({
  id: 'motion',
  name: 'Motion',
  category: 'shoes',
  enabled: true,
  order: 0,
  price: 100,
  images: ['motion-1.jpg', 'motion-2.jpg'],
  sizes: [],
  variants: [],
  ...overrides
});

test('App obtiene catálogo y versión activos del contexto para toda la UI', async () => {
  const source = await readFile(new URL('../../src/App.jsx', import.meta.url), 'utf8');
  assert.match(source, /const \{ activeCatalog, activeVersion \} = useCart\(\)/);
  assert.match(source, /<Header categories=\{categories\} products=\{products\}/);
  assert.match(source, /<CatalogSections categories=\{categories\} products=\{products\}/);
  assert.match(source, /<Footer catalogVersion=\{activeVersion\}/);
  assert.doesNotMatch(source, /products=\{catalog\.products\}/);
});

test('secciones, altas, bajas y precios reflejan el catálogo activo sin reload', () => {
  const initial = [product()];
  const updated = [
    product({ id: 'speed', name: 'Speed Pro', price: 145 }),
    product({ id: 'tour', name: 'Tour', price: 220, order: 1 })
  ];
  assert.deepEqual(buildCatalogSections(categories, initial)[0].products, initial);
  const nextProducts = buildCatalogSections(categories, updated)[0].products;
  assert.deepEqual(nextProducts.map(({ id }) => id), ['speed', 'tour']);
  assert.equal(nextProducts.find(({ id }) => id === 'speed').price, 145);
  assert.equal(nextProducts.some(({ id }) => id === 'motion'), false);
});

test('búsqueda y categorías se recalculan con los productos nuevos', () => {
  const initialIndex = buildProductSearchIndex([product()], categories);
  const updatedProducts = [product({ id: 'gravity', name: 'Gravity Pro' })];
  const updatedIndex = buildProductSearchIndex(updatedProducts, categories);
  assert.equal(searchProducts(initialIndex, 'motion').length, 1);
  assert.equal(searchProducts(updatedIndex, 'motion').length, 0);
  assert.equal(searchProducts(updatedIndex, 'gravity')[0].productId, 'gravity');
  assert.deepEqual(
    getProductsForCategory(updatedProducts, categories[0]).map(({ id }) => id),
    ['gravity']
  );
});

test('sincronizar producto conserva una variante y talle todavía válidos', () => {
  const state = { variantId: 'black', size: 'M', quantity: 3, imageIndex: 1 };
  const next = productSelectionReducer(state, {
    type: actions.SYNC_PRODUCT,
    variantId: 'black',
    sizes: ['S', 'M'],
    imageCount: 3
  });
  assert.equal(next, state);
});

test('variante eliminada cae a la primera válida y reinicia dependencias', () => {
  const state = { variantId: 'removed', size: 'M', quantity: 3, imageIndex: 1 };
  assert.deepEqual(productSelectionReducer(state, {
    type: actions.SYNC_PRODUCT,
    variantId: 'black',
    sizes: ['M'],
    imageCount: 2
  }), { variantId: 'black', size: null, quantity: 0, imageIndex: 0 });
});

test('imagen removida limita imageIndex sin perder una selección válida', () => {
  const state = { variantId: 'black', size: 'M', quantity: 3, imageIndex: 3 };
  assert.deepEqual(productSelectionReducer(state, {
    type: actions.SYNC_PRODUCT,
    variantId: 'black',
    sizes: ['M'],
    imageCount: 2
  }), { ...state, imageIndex: 1 });
});

test('toast se decide una sola vez por versión aplicada y nunca por mismo hash', () => {
  const previous = 'sha256-' + 'a'.repeat(64);
  const next = 'sha256-' + 'b'.repeat(64);
  const update = { changed: true, version: next };
  assert.equal(shouldNotifyCatalogUpdate(previous, update), true);
  assert.equal(shouldNotifyCatalogUpdate(next, update), false);
  assert.equal(shouldNotifyCatalogUpdate(previous, { changed: false, version: previous }), false);
});

test('footer muestra y actualiza una versión SHA-256 corta', () => {
  assert.equal(getShortCatalogVersion('sha256-20bc67ff' + 'a'.repeat(56)), '20bc67ff');
  assert.equal(getShortCatalogVersion('sha256-acde1234' + 'b'.repeat(56)), 'acde1234');
});

test('identificadores usados como keys continúan siendo únicos', () => {
  const updated = [product({ id: 'speed' }), product({ id: 'tour', order: 1 })];
  const sections = buildCatalogSections(categories, updated);
  assert.equal(new Set(sections.map(({ category }) => category.id)).size, sections.length);
  assert.equal(new Set(updated.map(({ id }) => id)).size, updated.length);
});
