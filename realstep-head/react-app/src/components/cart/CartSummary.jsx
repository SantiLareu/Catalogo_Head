import useCart from '../../hooks/useCart.js';
import { formatMoney } from '../../utils/money.js';

function CartSummary({ continueRef, onContinue }) {
  const { lines, reconciliation, total, units } = useCart();
  return (
    <div className="summary">
      <div><span>Unidades</span><strong>{units}</strong></div>
      <div className="grand"><span>Total</span><strong>{formatMoney(total)}</strong></div>
      <button
        className="primary"
        type="button"
        disabled={lines.length === 0 || reconciliation.checkoutBlocked}
        onClick={onContinue}
        ref={continueRef}
      >
        CONTINUAR
      </button>
      {reconciliation.checkoutBlocked && lines.length > 0 ? (
        <p className="summary-blocked" role="status">
          Revisá o eliminá los artículos señalados para continuar.
        </p>
      ) : null}
    </div>
  );
}

export default CartSummary;
