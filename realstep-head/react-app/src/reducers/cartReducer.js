export const cartActions = {
  HYDRATE_CART: 'HYDRATE_CART',
  ADD_LINE: 'ADD_LINE',
  REMOVE_LINE: 'REMOVE_LINE',
  SET_LINE_QUANTITY: 'SET_LINE_QUANTITY',
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
      const key = createLineKey(action.line);
      const index = state.findIndex((line) => createLineKey(line) === key);
      if (index < 0) return [...state, action.line];
      return state.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, quantity: line.quantity + action.line.quantity }
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
      if (!Number.isInteger(quantity) || quantity < 1) return state;
      return state.map((line) =>
        createLineKey(line) === key ? { ...line, quantity } : line
      );
    }
    case cartActions.CLEAR_CART:
      return [];
    default:
      return state;
  }
}
