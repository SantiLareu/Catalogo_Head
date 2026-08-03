import { useCallback, useEffect, useReducer, useRef } from 'react';
import { cartActions, cartReducer } from '../reducers/cartReducer.js';
import { readCart, removeCart, writeCart } from '../services/cartStorage.js';
import { initializePriceSnapshots } from '../services/cartReconciliation.js';

function usePersistentCart(catalog) {
  const [lines, dispatch] = useReducer(
    cartReducer,
    catalog,
    (initialCatalog) => initializePriceSnapshots(
      readCart(window.localStorage),
      initialCatalog.products,
      initialCatalog.stockIsAvailabilityOnly
    )
  );
  const removeOnNextWriteRef = useRef(false);

  useEffect(() => {
    if (removeOnNextWriteRef.current) {
      removeOnNextWriteRef.current = false;
      removeCart(window.localStorage);
      return;
    }
    writeCart(window.localStorage, lines);
  }, [lines]);

  const clearPersistedCart = useCallback(() => {
    removeOnNextWriteRef.current = true;
    removeCart(window.localStorage);
    dispatch({ type: cartActions.CLEAR_CART });
  }, []);

  return [lines, dispatch, clearPersistedCart];
}

export default usePersistentCart;
