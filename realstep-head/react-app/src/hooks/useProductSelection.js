import { useMemo, useReducer } from 'react';
import {
  getEffectiveCode,
  getEffectiveImages,
  getEffectivePrice,
  getEffectiveSizes,
  getFirstVariant,
  getVariantById
} from '../data/catalogSelectors.js';
import {
  createInitialProductSelection,
  productSelectionReducer
} from './productSelectionReducer.js';

function useProductSelection(product) {
  const firstVariant = useMemo(() => getFirstVariant(product), [product]);
  const [state, dispatch] = useReducer(
    productSelectionReducer,
    firstVariant?.id ?? null,
    createInitialProductSelection
  );
  const variant = useMemo(
    () => getVariantById(product, state.variantId),
    [product, state.variantId]
  );
  const images = useMemo(() => getEffectiveImages(product, variant), [product, variant]);
  const sizes = useMemo(() => getEffectiveSizes(product, variant), [product, variant]);

  return {
    state,
    dispatch,
    variant,
    images,
    sizes,
    code: getEffectiveCode(product, variant),
    price: getEffectivePrice(product, variant)
  };
}

export default useProductSelection;
