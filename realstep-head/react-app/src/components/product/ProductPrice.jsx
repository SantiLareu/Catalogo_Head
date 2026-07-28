import { formatMoney } from '../../utils/money.js';

function ProductPrice({ price }) {
  return (
    <div className="price">
      <span>Precio por unidad</span>
      <strong>{formatMoney(price ?? 0)}</strong>
    </div>
  );
}

export default ProductPrice;
