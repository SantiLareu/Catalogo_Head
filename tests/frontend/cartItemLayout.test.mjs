import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { reconcileCart } from '../../src/services/cartReconciliation.js';
import { resolveCartItemPresentation } from '../../src/services/cartItemPresentation.js';

const enabledProduct = {
  id: 'motion',
  name: 'Motion T-Shirt',
  enabled: true,
  code: null,
  price: 100,
  images: [],
  sizes: [],
  variants: [{
    id: 'black',
    colorName: 'Negro',
    code: 'MOTION-BK',
    price: 100,
    enabled: true,
    images: ['assets/products/motion-black.jpg'],
    sizes: [{ size: 'M', inStock: true, stock: 1 }]
  }]
};
const line = {
  productId: 'motion',
  variantId: 'black',
  size: 'M',
  quantity: 1,
  priceSnapshot: 100
};

test('línea válida conserva presentación normal con imagen, nombre, SKU y variante', () => {
  const entry = reconcileCart([line], [enabledProduct], true).entries[0];
  const presentation = resolveCartItemPresentation(entry);
  assert.equal(entry.status, 'available');
  assert.deepEqual(presentation, {
    name: 'Motion T-Shirt',
    variantName: 'Negro',
    code: 'MOTION-BK',
    imagePath: 'assets/products/motion-black.jpg'
  });
});

test('enabled true a false bloquea comercialmente pero conserva la presentación', () => {
  const previousEntry = reconcileCart([line], [enabledProduct], true).entries[0];
  const previous = resolveCartItemPresentation(previousEntry);
  const disabledProduct = { ...enabledProduct, enabled: false };
  const disabledEntry = reconcileCart([line], [disabledProduct], true).entries[0];
  const current = resolveCartItemPresentation(disabledEntry, previous);

  assert.equal(disabledEntry.status, 'product_removed');
  assert.equal(disabledEntry.currentPrice, null);
  assert.equal(disabledEntry.requiresReview, true);
  assert.equal(reconcileCart([line], [disabledProduct], true).checkoutBlocked, true);
  assert.deepEqual(current, previous);
});

test('producto ausente conserva snapshot visual en memoria', () => {
  const previous = {
    name: 'Motion T-Shirt',
    variantName: 'Negro',
    code: 'MOTION-BK',
    imagePath: 'assets/products/motion-black.jpg'
  };
  const entry = reconcileCart([line], [], true).entries[0];
  assert.deepEqual(resolveCartItemPresentation(entry, previous), previous);
});

test('CartItem siempre renderiza la misma base estructural y un placeholder', async () => {
  const source = await readFile(
    new URL('../../src/components/cart/CartItem.jsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /<div className="cart-item-media"/);
  assert.match(source, /<img className="cart-item-image"/);
  assert.match(source, /<span className="cart-item-image-placeholder">SIN IMAGEN<\/span>/);
  assert.match(source, /className="cart-item-heading"/);
  assert.match(source, /className="cart-item-details"/);
  assert.match(source, /className="cart-item-unit-price"/);
  assert.match(source, /className="cart-item-line-total"/);
  assert.match(source, /Precio no disponible/);
});

test('CSS reserva columnas y dimensiones equivalentes en desktop y mobile', async () => {
  const css = await readFile(
    new URL('../../src/styles/cart.css', import.meta.url),
    'utf8'
  );
  assert.match(css, /\.cart-item\{display:grid;grid-template-columns:84px minmax\(0,1fr\)/);
  assert.match(css, /\.cart-item-media\{[^}]*width:84px;height:84px/s);
  assert.match(css, /\.cart-item-image-placeholder\{[^}]*width:100%;height:100%/s);
  assert.match(css, /@media\(max-width:480px\)[\s\S]*grid-template-columns:64px minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:480px\)[\s\S]*\.cart-item-media\{width:64px;height:64px\}/);
  assert.match(css, /\.cart-item-heading\{min-width:0\}/);
  assert.match(css, /\.cart-item-line-total\{[^}]*min-width:92px/s);
});
