import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { getEffectivePrice, getVariantById } from '../src/data/catalogSelectors.js';
import {
  cartActions as actions,
  cartReducer,
  createLineKey
} from '../src/reducers/cartReducer.js';
import {
  CART_STORAGE_KEY,
  readCart,
  removeCart,
  sanitizeCart,
  writeCart
} from '../src/services/cartStorage.js';
import {
  acknowledgeCurrentPrice,
  initializePriceSnapshots,
  reconcileCart
} from '../src/services/cartReconciliation.js';

const products = [
  { id: 'plain', price: 100, sizes: [], variants: [] },
  {
    id: 'direct',
    price: 200,
    sizes: [
      { size: 'M', inStock: true },
      { size: 'L', inStock: false }
    ],
    variants: []
  },
  {
    id: 'variant',
    price: 300,
    sizes: [],
    variants: [
      {
        id: 'black ',
        price: 350,
        sizes: [{ size: 'M', inStock: true }]
      },
      {
        id: 'white',
        price: null,
        sizes: [{ size: 'M', inStock: true }, { size: 'L', inStock: true }]
      }
    ]
  },
  { id: 'free', price: 0, sizes: [], variants: [] }
];

test('claves distinguen producto, talle y variante+talle sin alterar IDs', () => {
  assert.notEqual(createLineKey({ productId: 'p' }), createLineKey({ productId: 'p', size: 'M' }));
  assert.notEqual(
    createLineKey({ productId: 'p', variantId: 'black ', size: 'M' }),
    createLineKey({ productId: 'p', variantId: 'black', size: 'M' })
  );
  assert.notEqual(
    createLineKey({ productId: 'p', variantId: 'black ', size: 'M' }),
    createLineKey({ productId: 'p', variantId: 'black ', size: 'L' })
  );
});

test('agrega línea nueva y combina una equivalente', () => {
  const line = { productId: 'plain', quantity: 2 };
  const added = cartReducer([], { type: actions.ADD_LINE, line });
  assert.deepEqual(added, [line]);
  assert.deepEqual(cartReducer(added, {
    type: actions.ADD_LINE,
    line: { productId: 'plain', quantity: 3 }
  }), [{ productId: 'plain', quantity: 5 }]);
});

test('variantes y talles distintos no se mezclan', () => {
  const first = { productId: 'variant', variantId: 'black ', size: 'M', quantity: 1 };
  const second = { productId: 'variant', variantId: 'white', size: 'M', quantity: 1 };
  const third = { productId: 'variant', variantId: 'white', size: 'L', quantity: 1 };
  const state = [first, second].reduce(
    (cart, line) => cartReducer(cart, { type: actions.ADD_LINE, line }),
    []
  );
  assert.equal(state.length, 2);
  assert.equal(cartReducer(state, { type: actions.ADD_LINE, line: third }).length, 3);
});

test('elimina una línea y vacía el carrito', () => {
  const lines = [
    { productId: 'plain', quantity: 1 },
    { productId: 'direct', size: 'M', quantity: 2 }
  ];
  assert.deepEqual(
    cartReducer(lines, { type: actions.REMOVE_LINE, line: lines[0] }),
    [lines[1]]
  );
  assert.deepEqual(cartReducer(lines, { type: actions.CLEAR_CART }), []);
});

test('aumenta y disminuye una línea mediante su clave estable', () => {
  const black = { productId: 'variant', variantId: 'black ', size: 'M', quantity: 3 };
  const white = { productId: 'variant', variantId: 'white', size: 'M', quantity: 2 };
  const increased = cartReducer([black, white], {
    type: actions.SET_LINE_QUANTITY,
    line: black,
    quantity: 4
  });
  assert.equal(increased[0].quantity, 4);
  assert.equal(increased[1].quantity, 2);

  const decreased = cartReducer(increased, {
    type: actions.SET_LINE_QUANTITY,
    line: black,
    quantity: 3
  });
  assert.equal(decreased[0].quantity, 3);
  assert.equal(decreased[1].quantity, 2);
  assert.equal(decreased[0].variantId, 'black ');
});

test('no permite cantidades inferiores a uno ni no enteras', () => {
  const line = { productId: 'plain', quantity: 1 };
  assert.deepEqual(cartReducer([line], {
    type: actions.SET_LINE_QUANTITY,
    line,
    quantity: 0
  }), [line]);
  assert.deepEqual(cartReducer([line], {
    type: actions.SET_LINE_QUANTITY,
    line,
    quantity: 1.5
  }), [line]);
});

test('cantidad editada recalcula unidades y total', () => {
  const line = { productId: 'plain', quantity: 2 };
  const updated = cartReducer([line], {
    type: actions.SET_LINE_QUANTITY,
    line,
    quantity: 4
  });
  assert.equal(updated.reduce((sum, item) => sum + item.quantity, 0), 4);
  assert.equal(updated.reduce((sum, item) => sum + 100 * item.quantity, 0), 400);
});

test('hidrata mediante la acción requerida', () => {
  const lines = [{ productId: 'plain', quantity: 1 }];
  assert.deepEqual(cartReducer([], { type: actions.HYDRATE_CART, lines }), lines);
});

test('unidades, total, precio de variante, fallback y precio cero', () => {
  const lines = [
    { productId: 'plain', quantity: 2 },
    { productId: 'variant', variantId: 'black ', size: 'M', quantity: 3 },
    { productId: 'variant', variantId: 'white', size: 'L', quantity: 1 },
    { productId: 'free', quantity: 4 }
  ];
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => {
    const product = products.find((item) => item.id === line.productId);
    const variant = line.variantId ? getVariantById(product, line.variantId) : null;
    return sum + getEffectivePrice(product, variant) * line.quantity;
  }, 0);
  assert.equal(units, 10);
  assert.equal(total, 1550);
});

test('sanea carrito válido y conserva ID de variante con espacio final', () => {
  const result = sanitizeCart([
    { productId: 'plain', quantity: 2 },
    { productId: 'direct', size: 'M', quantity: 1 },
    { productId: 'variant', variantId: 'black ', size: 'M', quantity: 3 }
  ], products);
  assert.equal(result.length, 3);
  assert.equal(result[2].variantId, 'black ');
});

test('conserva producto, variante y talle inexistentes para reconciliarlos', () => {
  const result = sanitizeCart([
    { productId: 'missing', quantity: 1 },
    { productId: 'variant', variantId: 'missing', size: 'M', quantity: 1 },
    { productId: 'variant', variantId: 'white', size: 'XL', quantity: 1 },
    { productId: 'plain', quantity: 1 }
  ], products);
  assert.deepEqual(result, [
    { productId: 'missing', quantity: 1 },
    { productId: 'variant', variantId: 'missing', size: 'M', quantity: 1 },
    { productId: 'variant', variantId: 'white', size: 'XL', quantity: 1 },
    { productId: 'plain', quantity: 1 }
  ]);
});

test('normaliza cantidades no enteras, cero y negativas; descarta no numéricas', () => {
  assert.deepEqual(sanitizeCart([
    { productId: 'plain', quantity: 2.9 },
    { productId: 'direct', size: 'M', quantity: 0 },
    { productId: 'free', quantity: -4 },
    { productId: 'plain', quantity: 'no' }
  ], products), [
    { productId: 'plain', quantity: 2 },
    { productId: 'direct', size: 'M', quantity: 1 },
    { productId: 'free', quantity: 1 }
  ]);
});

test('JSON corrupto no lanza y persistencia conserva clave y formato legacy', () => {
  const corruptStorage = { getItem: () => '{no' };
  assert.deepEqual(readCart(corruptStorage, products), []);

  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value)
  };
  const lines = [{ productId: 'variant', variantId: 'black ', size: 'M', quantity: 2 }];
  assert.equal(writeCart(storage, lines), true);
  assert.equal(CART_STORAGE_KEY, 'realstep-head-cart');
  assert.equal(memory.get(CART_STORAGE_KEY), JSON.stringify(lines));
  assert.deepEqual(readCart(storage, products), lines);
});

test('producto vigente se reconcilia sin cambios', () => {
  const lines = [{ productId: 'plain', quantity: 2, priceSnapshot: 100 }];
  const report = reconcileCart(lines, products);
  assert.equal(report.entries[0].status, 'available');
  assert.equal(report.checkoutBlocked, false);
  assert.equal(report.total, 200);
});

test('producto eliminado se conserva y bloquea checkout', () => {
  const line = { productId: 'removed', quantity: 1, priceSnapshot: 50 };
  const report = reconcileCart([line], products);
  assert.equal(report.entries[0].status, 'product_removed');
  assert.equal(report.entries[0].line, line);
  assert.equal(report.checkoutBlocked, true);
  assert.equal(report.total, 0);
});

test('variante eliminada se marca explícitamente', () => {
  const report = reconcileCart([{
    productId: 'variant',
    variantId: 'removed',
    size: 'M',
    quantity: 1,
    priceSnapshot: 300
  }], products);
  assert.deepEqual(report.entries[0].issues, ['variant_removed']);
});

test('talle sin stock se marca como size_unavailable', () => {
  const report = reconcileCart([{
    productId: 'direct',
    size: 'L',
    quantity: 1,
    priceSnapshot: 200
  }], products);
  assert.deepEqual(report.entries[0].issues, ['size_unavailable']);
  assert.equal(report.checkoutBlocked, true);
});

test('cantidad superior al stock disponible se marca como unavailable', () => {
  const stockProducts = [{
    id: 'limited',
    price: 10,
    sizes: [{ size: 'M', stock: 2, inStock: true }],
    variants: []
  }];
  const report = reconcileCart([{
    productId: 'limited',
    size: 'M',
    quantity: 3,
    priceSnapshot: 10
  }], stockProducts);
  assert.deepEqual(report.entries[0].issues, ['unavailable']);
});

test('precio modificado usa valor vigente y requiere reconocimiento', () => {
  const line = { productId: 'plain', quantity: 2, priceSnapshot: 90 };
  const changed = reconcileCart([line], products);
  assert.deepEqual(changed.entries[0].issues, ['price_changed']);
  assert.equal(changed.total, 200);
  assert.equal(changed.checkoutBlocked, true);

  const acknowledged = acknowledgeCurrentPrice(line, products);
  assert.equal(acknowledged.priceSnapshot, 100);
  assert.equal(reconcileCart([acknowledged], products).checkoutBlocked, false);
});

test('carrito mixto conserva líneas y suma sólo precios vigentes resolubles', () => {
  const lines = [
    { productId: 'plain', quantity: 2, priceSnapshot: 100 },
    { productId: 'removed', quantity: 3, priceSnapshot: 999 },
    { productId: 'variant', variantId: 'black ', size: 'M', quantity: 1, priceSnapshot: 300 }
  ];
  const report = reconcileCart(lines, products);
  assert.equal(report.entries.length, 3);
  assert.equal(report.units, 6);
  assert.equal(report.total, 550);
  assert.equal(report.checkoutBlocked, true);
  assert.deepEqual(report.entries[2].issues, ['price_changed']);
});

test('carrito legacy adopta una línea base vigente sin usarla como autoridad', () => {
  const legacy = [{ productId: 'plain', quantity: 1 }];
  const initialized = initializePriceSnapshots(legacy, products);
  assert.deepEqual(initialized, [{ productId: 'plain', quantity: 1, priceSnapshot: 100 }]);
  assert.equal(reconcileCart(initialized, products).total, 100);
});

test('reconciliación repetida es determinista', () => {
  const lines = initializePriceSnapshots([{
    productId: 'variant',
    variantId: 'white',
    size: 'M',
    quantity: 2
  }], products);
  assert.deepEqual(reconcileCart(lines, products), reconcileCart(lines, products));
  assert.deepEqual(initializePriceSnapshots(lines, products), lines);
});

test('carrito incompleto persiste y la cantidad editada se restaura', () => {
  const memory = new Map();
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => memory.set(key, value),
    removeItem: (key) => memory.delete(key)
  };
  const original = [{ productId: 'plain', quantity: 2 }];
  writeCart(storage, original);
  const edited = cartReducer(readCart(storage, products), {
    type: actions.SET_LINE_QUANTITY,
    line: original[0],
    quantity: 4
  });
  writeCart(storage, edited);
  assert.deepEqual(readCart(storage, products), [{ productId: 'plain', quantity: 4 }]);
});

test('éxito completo elimina la persistencia; un error la conserva', async () => {
  const memory = new Map([[CART_STORAGE_KEY, '[{"productId":"plain","quantity":2}]']]);
  const storage = {
    getItem: (key) => memory.get(key) ?? null,
    removeItem: (key) => memory.delete(key)
  };

  assert.equal(removeCart(storage), true);
  assert.equal(storage.getItem(CART_STORAGE_KEY), null);

  memory.set(CART_STORAGE_KEY, '[{"productId":"plain","quantity":2}]');
  await assert.rejects(
    Promise.reject(new Error('checkout')),
    /checkout/
  );
  assert.notEqual(storage.getItem(CART_STORAGE_KEY), null);
});

test('catálogo real coincide con el aprobado y cubre los casos de carrito requeridos', async () => {
  const catalog = JSON.parse(
    await readFile(new URL('../../generated/catalog.json', import.meta.url), 'utf8')
  );
  const approvedCatalog = JSON.parse(
    await readFile(
      new URL('../../tests/fixtures/catalog-baseline.json', import.meta.url),
      'utf8'
    )
  );
  assert.equal(catalog.products.length, approvedCatalog.products.length);
  assert.ok(catalog.products.some((product) =>
    product.variants.length === 0 && product.sizes.length === 0
  ));
  assert.ok(catalog.products.some((product) =>
    product.variants.length === 0 && product.sizes.length > 0
  ));
  assert.ok(catalog.products.some((product) =>
    product.variants.some((variant) => variant.sizes.length > 0)
  ));
  const trailingVariantProduct = catalog.products.find((product) =>
    product.variants.some((variant) => variant.id === 'black ')
  );
  const trailingVariant = getVariantById(trailingVariantProduct, 'black ');
  const size = trailingVariant.sizes[0].size;
  const restored = sanitizeCart([{
    productId: trailingVariantProduct.id,
    variantId: 'black ',
    size,
    quantity: 2
  }], catalog.products);
  assert.equal(restored[0].variantId, 'black ');
});
