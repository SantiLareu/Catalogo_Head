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
import { startCatalogPolling } from '../services/catalogPolling.js';
import { shouldNotifyCatalogUpdate } from '../utils/catalogVersion.js';

export const CartContext = createContext(null);

const CATALOG_UNAVAILABLE_MESSAGE =
  'No pudimos comprobar la disponibilidad actual. Intentá nuevamente.';

export function CartProvider({ children, initialCatalog, initialVersion }) {
  const [activeCatalogState, setActiveCatalogState] = useState({
    catalog: initialCatalog,
    version: initialVersion
  });
  const activeCatalog = activeCatalogState.catalog;
  const activeVersion = activeCatalogState.version;
  const products = activeCatalog.products;
  const [lines, dispatch, clearPersistedCart] = usePersistentCart(initialCatalog);
  const [toast, setToast] = useState('');
  const [resetVersion, setResetVersion] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState('idle');
  const catalogClientRef = useRef(null);
  const timerRef = useRef(null);
  const pulseListenersRef = useRef(new Set());
  const pendingPulseRef = useRef(false);
  const previousUnitsRef = useRef(null);
  const notifiedCatalogVersionRef = useRef(initialVersion);
  if (!catalogClientRef.current) {
    catalogClientRef.current = createPublishedCatalogClient({
      initialCatalog,
      initialVersion
    });
  }

  const showToast = useCallback((message) => {
    window.clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const subscribePulse = useCallback((listener) => {
    pulseListenersRef.current.add(listener);
    return () => pulseListenersRef.current.delete(listener);
  }, []);

  const reconciliation = useMemo(
    () => reconcileCart(lines, products, activeCatalog.stockIsAvailabilityOnly),
    [activeCatalog.stockIsAvailabilityOnly, lines, products]
  );
  const units = reconciliation.units;

  useEffect(() => {
    if (previousUnitsRef.current === null) {
      previousUnitsRef.current = units;
      return;
    }
    if (pendingPulseRef.current) {
      pendingPulseRef.current = false;
      previousUnitsRef.current = units;
      pulseListenersRef.current.forEach((listener) => listener());
    } else if (units !== previousUnitsRef.current) {
      previousUnitsRef.current = units;
    }
  }, [units]);

  const completeCheckout = useCallback(() => {
    clearPersistedCart();
    setResetVersion(advanceResetVersion);
    pendingPulseRef.current = true;
  }, [clearPersistedCart]);

  const reconcileWithCatalog = useCallback((currentCatalog) => {
    const currentProducts = currentCatalog.products;
    const refreshed = initializePriceSnapshots(
      lines,
      currentProducts,
      currentCatalog.stockIsAvailabilityOnly
    );
    if (refreshed.some((line, index) => line !== lines[index])) {
      dispatch({ type: cartActions.HYDRATE_CART, lines: refreshed });
    }
    return reconcileCart(
      refreshed,
      currentProducts,
      currentCatalog.stockIsAvailabilityOnly
    );
  }, [lines]);

  const refreshCart = useCallback(
    () => reconcileWithCatalog(activeCatalog),
    [activeCatalog, reconcileWithCatalog]
  );

  const checkCatalog = useCallback(async ({
    force = false,
    fresh = false,
    background = false,
    notify = true
  } = {}) => {
    if (!background) setCatalogStatus('checking');
    const result = await catalogClientRef.current.check({ force, fresh });
    if (result.status === 'current' || result.status === 'changes_detected') {
      if (result.changed) {
        setActiveCatalogState({
          catalog: result.catalog,
          version: result.version
        });
        if (notify && shouldNotifyCatalogUpdate(notifiedCatalogVersionRef.current, result)) {
          notifiedCatalogVersionRef.current = result.version;
          showToast('El catálogo se actualizó con la última información disponible.');
        }
      }
      if (!background) setCatalogStatus(result.status);
      return {
        ...result,
        valid: true,
        reconciliation: reconcileWithCatalog(result.catalog)
      };
    }
    if (!background) setCatalogStatus(result.status);
    return {
      ...result,
      valid: false,
      reconciliation: reconcileWithCatalog(activeCatalog)
    };
  }, [activeCatalog, reconcileWithCatalog, showToast]);

  const checkCatalogRef = useRef(checkCatalog);
  useEffect(() => {
    checkCatalogRef.current = checkCatalog;
  }, [checkCatalog]);
  useEffect(() => startCatalogPolling({
    check: (options) => checkCatalogRef.current(options)
  }), []);

  const value = useMemo(() => {
    const catalogChecking = catalogStatus === 'checking';
    const catalogUnavailable = catalogStatus === 'unavailable' || catalogStatus === 'error';

    return {
      lines,
      reconciliation,
      resetVersion,
      units: reconciliation.units,
      total: reconciliation.total,
      products,
      activeCatalog,
      activeVersion,
      catalogValidation: {
        status: catalogStatus,
        checking: catalogChecking,
        unavailable: catalogUnavailable,
        checkoutBlocked: catalogChecking || catalogUnavailable,
        message: catalogUnavailable ? CATALOG_UNAVAILABLE_MESSAGE : ''
      },
      toast,
      showToast,
      addLine: (line) => {
        pendingPulseRef.current = true;
        dispatch({ type: cartActions.ADD_LINE, line });
      },
      removeLine: (line) => {
        pendingPulseRef.current = true;
        dispatch({ type: cartActions.REMOVE_LINE, line });
      },
      setLineQuantity: (line, quantity) => {
        pendingPulseRef.current = true;
        dispatch({ type: cartActions.SET_LINE_QUANTITY, line, quantity });
      },
      acknowledgePrice: (line) => dispatch({
        type: cartActions.REPLACE_LINE,
        line,
        replacement: acknowledgeCurrentPrice(
          line,
          products,
          activeCatalog.stockIsAvailabilityOnly
        )
      }),
      refreshCart,
      checkCatalog,
      clearCart: () => {
        pendingPulseRef.current = true;
        dispatch({ type: cartActions.CLEAR_CART });
      },
      completeCheckout,
      subscribePulse
    };
  }, [activeCatalog, activeVersion, catalogStatus, checkCatalog, completeCheckout, lines, products, refreshCart, resetVersion, showToast, subscribePulse, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
