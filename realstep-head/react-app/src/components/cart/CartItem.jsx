import {
  getEffectiveCode,
  getEffectivePrice,
  getPrimaryImagePath,
  getVariantById
} from '../../data/catalogSelectors.js';
import { resolveProductImage } from '../../data/productImages.js';
import useCart from '../../hooks/useCart.js';
import { formatMoney } from '../../utils/money.js';

function CartItem({ line, product }) {
  const { removeLine } = useCart();
  const variant = line.variantId == null ? null : getVariantById(product, line.variantId);
  const image = resolveProductImage(getPrimaryImagePath(product, variant));
  const price = getEffectivePrice(product, variant);
  const code = getEffectiveCode(product, variant);

  return (
    <article className="item cart-item">
      {image ? <img className="cart-item-image" src={image} alt="" /> : null}
      <div className="cart-item-content">
        <div className="itemtop">
          <div>
            <h3>{product.name}</h3>
            <p>
              {[
                variant?.colorName ? `Color ${variant.colorName}` : null,
                line.size ? `Talle ${line.size}` : null,
                code ? `SKU ${code}` : null
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button
            className="remove"
            type="button"
            aria-label={`Eliminar ${product.name} del pedido`}
            onClick={() => removeLine(line)}
          >
            Eliminar
          </button>
        </div>
        <p>
          {line.quantity} unidad{line.quantity === 1 ? '' : 'es'} · {formatMoney(price)} c/u
        </p>
        <strong>{formatMoney(price * line.quantity)}</strong>
      </div>
    </article>
  );
}

export default CartItem;

