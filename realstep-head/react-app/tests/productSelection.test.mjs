import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getEffectiveCode,
  getEffectiveImages,
  getEffectivePrice,
  getFirstVariant,
  getVariantById
} from '../src/data/catalogSelectors.js';
import {
  createInitialProductSelection,
  productSelectionActions as actions,
  productSelectionReducer
} from '../src/hooks/productSelectionReducer.js';

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
    quantity: 1,
    imageIndex: 0
  });
});

test('cambio de variante reinicia talle e imagen y preserva ID literal', () => {
  const state = { variantId: 'white', size: 'M', quantity: 3, imageIndex: 1 };
  assert.deepEqual(
    productSelectionReducer(state, { type: actions.SELECT_VARIANT, variantId: 'black ' }),
    { variantId: 'black ', size: null, quantity: 3, imageIndex: 0 }
  );
  assert.equal(getVariantById(product, 'black ')?.id, 'black ');
  assert.equal(getVariantById(product, 'black'), null);
});

test('selección de talle', () => {
  const initial = createInitialProductSelection(null);
  assert.equal(
    productSelectionReducer(initial, { type: actions.SELECT_SIZE, size: 'XL' }).size,
    'XL'
  );
});

test('incremento, decremento y mínimo de cantidad', () => {
  const initial = createInitialProductSelection(null);
  const incremented = productSelectionReducer(initial, { type: actions.INCREMENT_QUANTITY });
  assert.equal(incremented.quantity, 2);
  assert.equal(
    productSelectionReducer(incremented, { type: actions.DECREMENT_QUANTITY }).quantity,
    1
  );
  assert.equal(
    productSelectionReducer(initial, { type: actions.DECREMENT_QUANTITY }).quantity,
    1
  );
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
