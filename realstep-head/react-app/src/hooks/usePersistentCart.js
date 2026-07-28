import { useEffect, useReducer } from 'react';
import { cartReducer } from '../reducers/cartReducer.js';
import { readCart, writeCart } from '../services/cartStorage.js';

function usePersistentCart(products) {
  const [lines, dispatch] = useReducer(
    cartReducer,
    products,
    (catalogProducts) => readCart(window.localStorage, catalogProducts)
  );

  useEffect(() => {
    writeCart(window.localStorage, lines);
  }, [lines]);

  return [lines, dispatch];
}

export default usePersistentCart;
