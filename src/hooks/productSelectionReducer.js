export const productSelectionActions = {
  SELECT_VARIANT: 'SELECT_VARIANT',
  SELECT_SIZE: 'SELECT_SIZE',
  SET_IMAGE: 'SET_IMAGE',
  NEXT_IMAGE: 'NEXT_IMAGE',
  PREVIOUS_IMAGE: 'PREVIOUS_IMAGE',
  INCREMENT_QUANTITY: 'INCREMENT_QUANTITY',
  DECREMENT_QUANTITY: 'DECREMENT_QUANTITY',
  SYNC_PRODUCT: 'SYNC_PRODUCT',
  RESET_SELECTION: 'RESET_SELECTION'
};

export function createInitialProductSelection(variantId = null) {
  return {
    variantId,
    size: null,
    quantity: 0,
    imageIndex: 0
  };
}

function circularIndex(index, imageCount) {
  return imageCount > 0 ? ((index % imageCount) + imageCount) % imageCount : 0;
}

export function productSelectionReducer(state, action) {
  switch (action.type) {
    case productSelectionActions.SELECT_VARIANT:
      return {
        ...state,
        variantId: action.variantId,
        size: null,
        quantity: 0,
        imageIndex: 0
      };
    case productSelectionActions.SELECT_SIZE:
      if (state.size === action.size) return state;
      return { ...state, size: action.size, quantity: 0 };
    case productSelectionActions.SET_IMAGE:
      return { ...state, imageIndex: circularIndex(action.imageIndex, action.imageCount) };
    case productSelectionActions.NEXT_IMAGE:
      return { ...state, imageIndex: circularIndex(state.imageIndex + 1, action.imageCount) };
    case productSelectionActions.PREVIOUS_IMAGE:
      return { ...state, imageIndex: circularIndex(state.imageIndex - 1, action.imageCount) };
    case productSelectionActions.INCREMENT_QUANTITY:
      return { ...state, quantity: state.quantity + (action.packDe || 1) };
    case productSelectionActions.DECREMENT_QUANTITY:
      return {
        ...state,
        quantity: Math.max(0, state.quantity - (action.packDe || 1))
      };
    case productSelectionActions.SYNC_PRODUCT: {
      const packDe = action.packDe || 1;
      const variantChanged = state.variantId !== action.variantId;
      const sizeStillExists = state.size == null || action.sizes.includes(state.size);
      const imageIndex = Math.min(
        state.imageIndex,
        Math.max(0, action.imageCount - 1)
      );
      const nextState = {
        ...state,
        variantId: action.variantId,
        size: variantChanged || !sizeStillExists ? null : state.size,
        quantity:
          variantChanged ||
          !sizeStillExists ||
          state.quantity % packDe !== 0
            ? 0
            : state.quantity,
        imageIndex: variantChanged ? 0 : imageIndex
      };

      return (
        nextState.variantId === state.variantId &&
        nextState.size === state.size &&
        nextState.quantity === state.quantity &&
        nextState.imageIndex === state.imageIndex
      ) ? state : nextState;
    }
    case productSelectionActions.RESET_SELECTION:
      return createInitialProductSelection(action.variantId ?? null);
    default:
      return state;
  }
}
