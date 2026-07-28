import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../../hooks/useBodyScrollLock.js';
import useCart from '../../hooks/useCart.js';
import useFocusTrap from '../../hooks/useFocusTrap.js';
import CartItem from './CartItem.jsx';
import CartSummary from './CartSummary.jsx';

function CartDrawer({ continueRef, onClose, onContinue, openerRef, products }) {
  const { lines } = useCart();
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const close = useCallback(() => onClose(), [onClose]);

  useBodyScrollLock(true);
  useFocusTrap(drawerRef, true, close);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => openerRef.current?.focus({ preventScroll: true });
  }, [openerRef]);

  return createPortal(
    <aside
      className="drawer open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-title"
      ref={drawerRef}
      tabIndex="-1"
    >
      <div className="back" onClick={close} aria-hidden="true" />
      <div className="dpanel">
        <div className="dhead">
          <div><p className="ey">TU SELECCIÓN</p><h2 id="cart-title">Pedido</h2></div>
          <button className="close" type="button" aria-label="Cerrar pedido" onClick={close} ref={closeRef}>×</button>
        </div>
        <div className="items">
          {lines.length === 0 ? (
            <div className="empty">
              <div><strong>Tu pedido está vacío.</strong><p>Elegí un modelo, talle y cantidad para continuar.</p></div>
            </div>
          ) : lines.map((line) => {
            const product = products.find((item) => item.id === line.productId);
            return product ? <CartItem key={JSON.stringify(line)} line={line} product={product} /> : null;
          })}
        </div>
        <CartSummary continueRef={continueRef} onContinue={onContinue} />
      </div>
    </aside>,
    document.body
  );
}

export default CartDrawer;
