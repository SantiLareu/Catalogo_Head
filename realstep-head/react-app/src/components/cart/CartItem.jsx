import {
  getEffectiveCode,
  getPrimaryImagePath
} from '../../data/catalogSelectors.js';
import { resolveProductImage } from '../../data/productImages.js';
import useCart from '../../hooks/useCart.js';
import { cartIssueMessages } from '../../services/cartReconciliation.js';
import { formatMoney } from '../../utils/money.js';

function CartItem({ entry }) {
  const { acknowledgePrice, removeLine, setLineQuantity } = useCart();
  const { currentPrice: price, issues, line, product, variant } = entry;
  const image = product ? resolveProductImage(getPrimaryImagePath(product, variant)) : null;
  const code = product && !issues.includes('variant_removed')
    ? getEffectiveCode(product, variant)
    : null;
  const displayName = product?.name || `Producto ${line.productId}`;

  return (
    <article className={`item cart-item${issues.length > 0 ? ' cart-item--review' : ''}`}>
      {image ? <img className="cart-item-image" src={image} alt="" /> : null}
      <div className="cart-item-content">
        <div className="itemtop">
          <div>
            <h3>{displayName}</h3>
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
            aria-label={`Eliminar ${displayName} del pedido`}
            onClick={() => removeLine(line)}
          >
            Eliminar
          </button>
        </div>
        <div className="cart-item-bottom">
          <div>
            <p>{Number.isFinite(price) ? `${formatMoney(price)} c/u` : 'Precio no disponible'}</p>
            <div className="cart-item-quantity" aria-label={`Cantidad de ${displayName}`}>
              <button
                type="button"
                aria-label={`Disminuir cantidad de ${displayName}`}
                disabled={line.quantity <= 1}
                onClick={() => setLineQuantity(line, line.quantity - 1)}
              >
                −
              </button>
              <span aria-live="polite" aria-atomic="true">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Aumentar cantidad de ${displayName}`}
                onClick={() => setLineQuantity(line, line.quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
          <strong>{Number.isFinite(price) ? formatMoney(price * line.quantity) : '—'}</strong>
        </div>
        {issues.length > 0 ? (
          <div className="cart-item-issues" role="status">
            {issues.map((issue) => <p key={issue}>{cartIssueMessages[issue]}</p>)}
            {issues.includes('price_changed') && issues.length === 1 ? (
              <button type="button" onClick={() => acknowledgePrice(line)}>
                ACEPTAR PRECIO VIGENTE
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default CartItem;
