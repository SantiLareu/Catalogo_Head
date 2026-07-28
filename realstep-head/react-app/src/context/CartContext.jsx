import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getEffectivePrice, getVariantById } from '../data/catalogSelectors.js';
import usePersistentCart from '../hooks/usePersistentCart.js';
import { cartActions } from '../reducers/cartReducer.js';

export const CartContext = createContext(null);

export function CartProvider({ children, products }) {
  const [lines, dispatch] = usePersistentCart(products);
  const [toast, setToast] = useState('');
  const timerRef = useRef(null);

  const showToast = useCallback((message) => {
    window.clearTimeout(timerRef.current);
    setToast(message);
    timerRef.current = window.setTimeout(() => setToast(''), 2400);
  }, []);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const value = useMemo(() => {
    const units = lines.reduce((sum, line) => sum + line.quantity, 0);
    const total = lines.reduce((sum, line) => {
      const product = products.find((item) => item.id === line.productId);
      if (!product) return sum;
      const variant = line.variantId == null
        ? null
        : getVariantById(product, line.variantId);
      return sum + getEffectivePrice(product, variant) * line.quantity;
    }, 0);

    return {
      lines,
      units,
      total,
      toast,
      showToast,
      addLine: (line) => dispatch({ type: cartActions.ADD_LINE, line }),
      removeLine: (line) => dispatch({ type: cartActions.REMOVE_LINE, line }),
      clearCart: () => dispatch({ type: cartActions.CLEAR_CART })
    };
  }, [lines, products, showToast, toast]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
