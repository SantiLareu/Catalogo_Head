import { useEffect, useLayoutEffect, useMemo, useReducer } from 'react';
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
  productSelectionActions,
  productSelectionReducer
} from './productSelectionReducer.js';

function useProductSelection(product, resetVersion = 0) {
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

  useLayoutEffect(() => {
    const currentVariant = getVariantById(product, state.variantId);
    const nextVariant = currentVariant || firstVariant;
    dispatch({
      type: productSelectionActions.SYNC_PRODUCT,
      variantId: nextVariant?.id ?? null,
      sizes: getEffectiveSizes(product, nextVariant).map((item) => item.size),
      imageCount: getEffectiveImages(product, nextVariant).length
    });
  }, [firstVariant, product]);

  useEffect(() => {
    dispatch({
      type: productSelectionActions.RESET_SELECTION,
      variantId: firstVariant?.id ?? null
    });
  }, [resetVersion]);

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
