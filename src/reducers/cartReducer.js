export const cartActions = {
  HYDRATE_CART: 'HYDRATE_CART',
  ADD_LINE: 'ADD_LINE',
  REMOVE_LINE: 'REMOVE_LINE',
  SET_LINE_QUANTITY: 'SET_LINE_QUANTITY',
  REPLACE_LINE: 'REPLACE_LINE',
  CLEAR_CART: 'CLEAR_CART'
};

export function createLineKey(line) {
  return JSON.stringify([
    line.productId,
    Object.hasOwn(line, 'variantId') ? line.variantId : null,
    Object.hasOwn(line, 'size') ? line.size : null
  ]);
}

export function cartReducer(state, action) {
  switch (action.type) {
    case cartActions.HYDRATE_CART:
      return Array.isArray(action.lines) ? action.lines : [];
    case cartActions.ADD_LINE: {
      const packDe = action.packDe || 1;
      if (
        !Number.isInteger(action.line?.quantity) ||
        action.line.quantity < 1 ||
        action.line.quantity % packDe !== 0
      ) return state;
      const key = createLineKey(action.line);
      const index = state.findIndex((line) => createLineKey(line) === key);
      if (index < 0) return [...state, action.line];
      const combinedQuantity = state[index].quantity + action.line.quantity;
      if (!Number.isInteger(combinedQuantity) || combinedQuantity % packDe !== 0) {
        return state;
      }
      return state.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, quantity: combinedQuantity }
          : line
      );
    }
    case cartActions.REMOVE_LINE: {
      const key = createLineKey(action.line);
      return state.filter((line) => createLineKey(line) !== key);
    }
    case cartActions.SET_LINE_QUANTITY: {
      const key = createLineKey(action.line);
      const quantity = Number(action.quantity);
      const packDe = action.packDe || 1;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity % packDe !== 0) {
        return state;
      }
      return state.map((line) =>
        createLineKey(line) === key ? { ...line, quantity } : line
      );
    }
    case cartActions.REPLACE_LINE: {
      const key = createLineKey(action.line);
      return state.map((line) => createLineKey(line) === key ? action.replacement : line);
    }
    case cartActions.CLEAR_CART:
      return [];
    default:
      return state;
  }
}
