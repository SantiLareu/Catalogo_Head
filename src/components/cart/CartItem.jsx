import { useEffect, useRef } from 'react';
import { resolveProductImage } from '../../data/productImages.js';
import useCart from '../../hooks/useCart.js';
import { resolveCartItemPresentation } from '../../services/cartItemPresentation.js';
import { cartIssueMessages } from '../../services/cartReconciliation.js';
import { formatMoney } from '../../utils/money.js';
import {
  getPackDe,
  nextPackQuantity,
  previousPackQuantity
} from '../../utils/packQuantity.js';

function CartItem({ entry }) {
  const { acknowledgePrice, removeLine, setLineQuantity } = useCart();
  const { currentPrice: price, issues, line } = entry;
  const previousPresentationRef = useRef({});
  const presentation = resolveCartItemPresentation(entry, previousPresentationRef.current);
  useEffect(() => {
    previousPresentationRef.current = presentation;
  }, [presentation]);
  const image = resolveProductImage(presentation.imagePath);
  const displayName = presentation.name;
  const packDe = getPackDe(entry.product);
  const details = [
    presentation.variantName ? `Color ${presentation.variantName}` : null,
    line.size ? `Talle ${line.size}` : null,
    presentation.code ? `SKU ${presentation.code}` : null
  ].filter(Boolean).join(' · ');

  return (
    <article className={`item cart-item${issues.length > 0 ? ' cart-item--review' : ''}`}>
      <div className="cart-item-media" aria-hidden="true">
        {image ? (
          <img className="cart-item-image" src={image} alt="" />
        ) : (
          <span className="cart-item-image-placeholder">SIN IMAGEN</span>
        )}
      </div>
      <div className="cart-item-content">
        <div className="itemtop">
          <div className="cart-item-heading">
            <h3>{displayName}</h3>
            <p className="cart-item-details">{details || '\u00a0'}</p>
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
            <p className="cart-item-unit-price">
              {Number.isFinite(price) ? `${formatMoney(price)} c/u` : 'Precio no disponible'}
            </p>
            <div className="cart-item-quantity" aria-label={`Cantidad de ${displayName}`}>
              <button
                type="button"
                aria-label={`Disminuir cantidad de ${displayName}`}
                disabled={line.quantity <= packDe}
                onClick={() => setLineQuantity(
                  line,
                  previousPackQuantity(line.quantity, packDe)
                )}
              >
                −
              </button>
              <span aria-live="polite" aria-atomic="true">{line.quantity}</span>
              <button
                type="button"
                aria-label={`Aumentar cantidad de ${displayName}`}
                onClick={() => setLineQuantity(
                  line,
                  nextPackQuantity(line.quantity, packDe)
                )}
              >
                +
              </button>
            </div>
          </div>
          <strong className="cart-item-line-total">
            {Number.isFinite(price) ? formatMoney(price * line.quantity) : 'Precio no disponible'}
          </strong>
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
