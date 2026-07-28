import useCart from '../../hooks/useCart.js';
import { formatMoney } from '../../utils/money.js';

function CartSummary({ continueRef, onContinue }) {
  const { lines, total, units } = useCart();
  return (
    <div className="summary">
      <div><span>Unidades</span><strong>{units}</strong></div>
      <div className="grand"><span>Total</span><strong>{formatMoney(total)}</strong></div>
      <button
        className="primary"
        type="button"
        disabled={lines.length === 0}
        onClick={onContinue}
        ref={continueRef}
      >
        CONTINUAR
      </button>
    </div>
  );
}

export default CartSummary;
