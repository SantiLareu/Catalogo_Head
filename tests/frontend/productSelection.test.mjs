import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  getEffectiveCode,
  getEffectiveImages,
  getEffectivePrice,
  getFirstVariant,
  getVariantById
} from '../../src/data/catalogSelectors.js';
import {
  createInitialProductSelection,
  productSelectionActions as actions,
  productSelectionReducer
} from '../../src/hooks/productSelectionReducer.js';
import { advanceResetVersion } from '../../src/utils/resetVersion.js';

const product = {
  id: 'fixture',
  code: 'PARENT',
  price: 100,
  images: ['parent.jpg'],
  variants: [
    { id: 'black ', code: 'LEGACY', price: 125, order: 0, images: ['black-1.jpg', 'shared.jpg'] },
    { id: 'white', code: 'WHITE', price: null, order: 1, images: ['white-1.jpg'] }
  ]
};

test('estado inicial', () => {
  assert.deepEqual(createInitialProductSelection('black '), {
    variantId: 'black ',
    size: null,
    quantity: 0,
    imageIndex: 0
  });
});

test('cambio de variante reinicia talle, cantidad e imagen y preserva ID literal', () => {
  const state = { variantId: 'white', size: 'M', quantity: 3, imageIndex: 1 };
  assert.deepEqual(
    productSelectionReducer(state, { type: actions.SELECT_VARIANT, variantId: 'black ' }),
    { variantId: 'black ', size: null, quantity: 0, imageIndex: 0 }
  );
  assert.equal(getVariantById(product, 'black ')?.id, 'black ');
  assert.equal(getVariantById(product, 'black'), null);
});

test('cambiar únicamente de imagen conserva talle y cantidad', () => {
  const state = { variantId: 'black ', size: 'M', quantity: 3, imageIndex: 0 };
  assert.deepEqual(
    productSelectionReducer(state, {
      type: actions.SET_IMAGE,
      imageIndex: 1,
      imageCount: 2
    }),
    { ...state, imageIndex: 1 }
  );
});

test('éxito de checkout avanza la señal y reinicia la selección completa', () => {
  const resetVersion = advanceResetVersion(4);
  assert.equal(resetVersion, 5);
  const changed = { variantId: 'white', size: 'M', quantity: 4, imageIndex: 1 };
  assert.deepEqual(
    productSelectionReducer(changed, {
      type: actions.RESET_SELECTION,
      variantId: 'black '
    }),
    createInitialProductSelection('black ')
  );
});

test('SELECT_SIZE cambia talle, reinicia cantidad y conserva variante e imagen', () => {
  const state = { variantId: 'black ', size: 'S', quantity: 3, imageIndex: 1 };
  assert.deepEqual(
    productSelectionReducer(state, { type: actions.SELECT_SIZE, size: 'M' }),
    { variantId: 'black ', size: 'M', quantity: 0, imageIndex: 1 }
  );
});

test('volver a seleccionar el mismo talle mantiene un estado estable', () => {
  const state = { variantId: 'black ', size: 'M', quantity: 0, imageIndex: 1 };
  assert.deepEqual(
    productSelectionReducer(state, { type: actions.SELECT_SIZE, size: 'M' }),
    state
  );
});

test('talles agotados continúan deshabilitados y no disparan selección', async () => {
  const source = await readFile(
    new URL('../../src/components/product/SizeSelector.jsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /disabled=\{!available\}/);
  assert.match(source, /onClick=\{\(\) => available && onSelect\(size\.size\)\}/);
});

test('incremento y decremento respetan packDe 6 hasta cero', () => {
  const initial = createInitialProductSelection(null);
  const first = productSelectionReducer(initial, {
    type: actions.INCREMENT_QUANTITY,
    packDe: 6
  });
  assert.equal(first.quantity, 6);
  const second = productSelectionReducer(first, {
    type: actions.INCREMENT_QUANTITY,
    packDe: 6
  });
  assert.equal(second.quantity, 12);
  assert.equal(
    productSelectionReducer(second, {
      type: actions.DECREMENT_QUANTITY,
      packDe: 6
    }).quantity,
    6
  );
  assert.equal(
    productSelectionReducer(first, {
      type: actions.DECREMENT_QUANTITY,
      packDe: 6
    }).quantity,
    0
  );
});

test('packDe 1 mantiene pasos unitarios', () => {
  const initial = createInitialProductSelection(null);
  const incremented = productSelectionReducer(initial, {
    type: actions.INCREMENT_QUANTITY,
    packDe: 1
  });
  assert.equal(incremented.quantity, 1);
  assert.equal(productSelectionReducer(incremented, {
    type: actions.INCREMENT_QUANTITY,
    packDe: 1
  }).quantity, 2);
  assert.equal(productSelectionReducer(incremented, {
    type: actions.DECREMENT_QUANTITY,
    packDe: 1
  }).quantity, 0);
});

test('la leyenda de pack sólo se muestra para múltiplos mayores que uno', async () => {
  const source = await readFile(
    new URL('../../src/components/product/QuantitySelector.jsx', import.meta.url),
    'utf8'
  );
  assert.match(source, /packDe > 1/);
  assert.match(source, /Venta por pack de \{packDe\} unidades/);
});

test('siguiente y anterior son circulares', () => {
  const initial = createInitialProductSelection(null);
  const previous = productSelectionReducer(initial, {
    type: actions.PREVIOUS_IMAGE,
    imageCount: 3
  });
  assert.equal(previous.imageIndex, 2);
  assert.equal(
    productSelectionReducer(previous, {
      type: actions.NEXT_IMAGE,
      imageCount: 3
    }).imageIndex,
    0
  );
});

test('imagen, código y precio efectivos usan la variante activa', () => {
  const black = getFirstVariant(product);
  const white = getVariantById(product, 'white');
  assert.deepEqual(getEffectiveImages(product, black), ['black-1.jpg', 'shared.jpg']);
  assert.equal(getEffectiveCode(product, black), 'LEGACY');
  assert.equal(getEffectivePrice(product, black), 125);
  assert.equal(getEffectivePrice(product, white), 100);
});
