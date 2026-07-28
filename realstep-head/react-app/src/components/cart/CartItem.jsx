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
  const { removeLine, setLineQuantity } = useCart();
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
        <div className="cart-item-bottom">
          <div>
            <p>{formatMoney(price)} c/u</p>
            <div className="cart-item-quantity" aria-label={`Cantidad de ${product.name}`}>
              <button
                type="button"
                aria-label={`Disminuir cantidad de ${product.name}`}
                disabled={line.quantity <= 1}
                onClick={() => setLineQuantity(line, line.quantity - 1)}
              >
                −
              </button>
              <span aria-live="polite" aria-atomic="true">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Aumentar cantidad de ${product.name}`}
                onClick={() => setLineQuantity(line, line.quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
          <strong>{formatMoney(price * line.quantity)}</strong>
        </div>
      </div>
    </article>
  );
}

export default CartItem;
