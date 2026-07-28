import useCart from '../../hooks/useCart.js';
import { formatMoney } from '../../utils/money.js';

function CartSummary() {
  const { total, units } = useCart();
  return (
    <div className="summary">
      <div><span>Unidades</span><strong>{units}</strong></div>
      <div className="grand"><span>Total</span><strong>{formatMoney(total)}</strong></div>
      <button
        className="primary"
        type="button"
        disabled
        title="El checkout se migrará en la Etapa 7"
      >
        CONTINUAR · ETAPA 7
      </button>
    </div>
  );
}

export default CartSummary;

