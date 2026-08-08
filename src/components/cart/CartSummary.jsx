import useCart from '../../hooks/useCart.js';
import { formatMoney } from '../../utils/money.js';

function CartSummary({ continueRef, onContinue }) {
  const { catalogValidation, lines, reconciliation, total, units } = useCart();
  const blocked = reconciliation.checkoutBlocked || catalogValidation.checkoutBlocked;
  return (
    <div className="summary">
      <div><span>Unidades</span><strong>{units}</strong></div>
      <div className="grand"><span>Total</span><strong>{formatMoney(total)}</strong></div>
      <button
        className="primary"
        type="button"
        disabled={lines.length === 0 || blocked}
        onClick={onContinue}
        ref={continueRef}
      >
        {catalogValidation.checking ? 'Comprobando catálogo…' : 'CONTINUAR'}
      </button>
      {blocked && lines.length > 0 && !catalogValidation.checking ? (
        <p className="summary-blocked" role="status">
          {catalogValidation.unavailable
            ? catalogValidation.message
            : 'Revisá o eliminá los artículos señalados para continuar.'}
        </p>
      ) : null}
    </div>
  );
}

export default CartSummary;
