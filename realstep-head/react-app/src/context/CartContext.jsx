import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentCart from '../hooks/usePersistentCart.js';
import { cartActions } from '../reducers/cartReducer.js';
import {
  acknowledgeCurrentPrice,
  initializePriceSnapshots,
  reconcileCart
} from '../services/cartReconciliation.js';
import { advanceResetVersion } from '../utils/resetVersion.js';
import { createPublishedCatalogClient } from '../services/publishedCatalog.js';

export const CartContext = createContext(null);

const CATALOG_UNAVAILABLE_MESSAGE =
  'No pudimos comprobar la disponibilidad actual. Intentá nuevamente.';

export function CartProvider({ children, initialCatalog }) {
  const [activeCatalog, setActiveCatalog] = useState(initialCatalog);
  const products = activeCatalog.products;
  const [lines, dispatch, clearPersistedCart] = usePersistentCart(initialCatalog.products);
  const [toast, setToast] = useState('');
  const [resetVersion, setResetVersion] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState('idle');
  const catalogClientRef = useRef(null);
  const timerRef = useRef(null);
  if (!catalogClientRef.current) {
    catalogClientRef.current = createPublishedCatalogClient({ initialCatalog });
  }

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

  const reconcileWithProducts = useCallback((currentProducts) => {
    const refreshed = initializePriceSnapshots(lines, currentProducts);
    if (refreshed.some((line, index) => line !== lines[index])) {
      dispatch({ type: cartActions.HYDRATE_CART, lines: refreshed });
    }
    return reconcileCart(refreshed, currentProducts);
  }, [lines]);

  const refreshCart = useCallback(
    () => reconcileWithProducts(products),
    [products, reconcileWithProducts]
  );

  const checkCatalog = useCallback(async ({ force = false } = {}) => {
    setCatalogStatus('checking');
    const result = await catalogClientRef.current.check({ force });
    if (result.status === 'current' || result.status === 'changes_detected') {
      if (result.changed) setActiveCatalog(result.catalog);
      setCatalogStatus(result.status);
      return {
        ...result,
        valid: true,
        reconciliation: reconcileWithProducts(result.catalog.products)
      };
    }
    setCatalogStatus(result.status);
    return {
      ...result,
      valid: false,
      reconciliation: reconcileWithProducts(products)
    };
  }, [products, reconcileWithProducts]);

  useEffect(() => {
    const checkWhenVisible = () => {
      if (document.visibilityState === 'visible') void checkCatalog();
    };
    const checkWhenFocused = () => void checkCatalog();
    document.addEventListener('visibilitychange', checkWhenVisible);
    window.addEventListener('focus', checkWhenFocused);
    return () => {
      document.removeEventListener('visibilitychange', checkWhenVisible);
      window.removeEventListener('focus', checkWhenFocused);
    };
  }, [checkCatalog]);

  const value = useMemo(() => {
    const reconciliation = reconcileCart(lines, products);
    const catalogChecking = catalogStatus === 'checking';
    const catalogUnavailable = catalogStatus === 'unavailable' || catalogStatus === 'error';

    return {
      lines,
      reconciliation,
      resetVersion,
      units: reconciliation.units,
      total: reconciliation.total,
      products,
      catalogValidation: {
        status: catalogStatus,
        checking: catalogChecking,
        unavailable: catalogUnavailable,
        checkoutBlocked: catalogChecking || catalogUnavailable,
        message: catalogUnavailable ? CATALOG_UNAVAILABLE_MESSAGE : ''
      },
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
      checkCatalog,
      clearCart: () => dispatch({ type: cartActions.CLEAR_CART }),
      completeCheckout
    };
  }, [catalogStatus, checkCatalog, completeCheckout, lines, products, refreshCart, resetVersion, showToast, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
