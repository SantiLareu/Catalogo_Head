import {
  buildOrderLines,
  buildOrderTotals
} from '../../services/emailService.js';
import { formatMoney } from '../../utils/money.js';

function OrderPreview({ cart, products }) {
  const lines = buildOrderLines(cart, products);
  const totals = buildOrderTotals(lines);

  return (
    <section className="preview checkout-preview" aria-labelledby="order-preview-title">
      <h3 id="order-preview-title">Vista previa del pedido</h3>
      <div className="checkout-preview-scroll">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={JSON.stringify([line.productId, line.variantId, line.size])}>
                <td>
                  <strong>{line.name}</strong>
                  {[line.variantName ? `Color ${line.variantName}` : null,
                    line.size ? `Talle ${line.size}` : null,
                    line.code ? `SKU ${line.code}` : null
                  ].filter(Boolean).map((detail) => <small key={detail}>{detail}</small>)}
                </td>
                <td>{line.quantity}</td>
                <td>{formatMoney(line.unitPrice)}</td>
                <td><strong>{formatMoney(line.subtotal)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="checkout-preview-totals">
        <span><strong>{totals.units}</strong> unidades</span>
        <span>Total estimado: <strong>{formatMoney(totals.total)}</strong></span>
      </div>
    </section>
  );
}

export default OrderPreview;

