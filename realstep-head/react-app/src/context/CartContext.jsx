import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentCart from '../hooks/usePersistentCart.js';
import { cartActions } from '../reducers/cartReducer.js';
import {
  acknowledgeCurrentPrice,
  initializePriceSnapshots,
  reconcileCart
} from '../services/cartReconciliation.js';
import { advanceResetVersion } from '../utils/resetVersion.js';

export const CartContext = createContext(null);

export function CartProvider({ children, products }) {
  const [lines, dispatch, clearPersistedCart] = usePersistentCart(products);
  const [toast, setToast] = useState('');
  const [resetVersion, setResetVersion] = useState(0);
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    window.clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const completeCheckout = useCallback(() => {
    clearPersistedCart();
    setResetVersion(advanceResetVersion);
  }, [clearPersistedCart]);

  const refreshCart = useCallback(() => {
    const refreshed = initializePriceSnapshots(lines, products);
    if (refreshed.some((line, index) => line !== lines[index])) {
      dispatch({ type: cartActions.HYDRATE_CART, lines: refreshed });
    }
    return reconcileCart(refreshed, products);
  }, [lines, products]);

  const value = useMemo(() => {
    const reconciliation = reconcileCart(lines, products);

    return {
      lines,
      reconciliation,
      resetVersion,
      units: reconciliation.units,
      total: reconciliation.total,
      toast,
      showToast,
      addLine: (line) => dispatch({ type: cartActions.ADD_LINE, line }),
      removeLine: (line) => dispatch({ type: cartActions.REMOVE_LINE, line }),
      setLineQuantity: (line, quantity) =>
        dispatch({ type: cartActions.SET_LINE_QUANTITY, line, quantity }),
      acknowledgePrice: (line) => dispatch({
        type: cartActions.REPLACE_LINE,
        line,
        replacement: acknowledgeCurrentPrice(line, products)
      }),
      refreshCart,
      clearCart: () => dispatch({ type: cartActions.CLEAR_CART }),
      completeCheckout
    };
  }, [completeCheckout, lines, products, refreshCart, resetVersion, showToast, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
