import emailjs from '@emailjs/browser';
import { companyConfig as defaultCompanyConfig } from '../config/company.js';
import { emailConfig as defaultEmailConfig } from '../config/email.js';
import {
  getEffectiveCode,
  getEffectivePrice,
  getVariantById
} from '../data/catalogSelectors.js';
import { escapeHtml } from '../utils/html.js';
import { formatMoney } from '../utils/money.js';

export const OWNER_TO_CUSTOMER_DELAY_MS = 1150;

export class CheckoutEmailError extends Error {
  constructor(stage, message, options = {}) {
    super(message, options);
    this.name = 'CheckoutEmailError';
    this.stage = stage;
    this.ownerSent = options.ownerSent === true;
    this.code = options.code || stage;
  }
}

export function validateEmailConfig(emailConfig, companyConfig) {
  const missing = [];
  if (!emailConfig?.serviceId) missing.push('serviceId');
  if (!emailConfig?.templateId) missing.push('templateId');
  if (!emailConfig?.publicKey) missing.push('publicKey');
  if (!companyConfig?.orderEmail) missing.push('orderEmail');
  if (!companyConfig?.companyName) missing.push('companyName');
  if (!companyConfig?.catalogName) missing.push('catalogName');
  return { valid: missing.length === 0, missing };
}

export function buildOrderLines(cart, products) {
  return cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) return [];
    const variant = line.variantId == null
      ? null
      : getVariantById(product, line.variantId);
    const price = getEffectivePrice(product, variant);
    return [{
      productId: line.productId,
      variantId: line.variantId,
      size: line.size,
      name: product.name,
      variantName: variant?.colorName || null,
      code: getEffectiveCode(product, variant) || null,
      quantity: line.quantity,
      unitPrice: price,
      subtotal: price * line.quantity
    }];
  });
}

export function buildOrderTotals(lines) {
  return lines.reduce(
    (totals, line) => ({
      units: totals.units + line.quantity,
      total: totals.total + line.subtotal
    }),
    { units: 0, total: 0 }
  );
}

export function buildProductRowsHtml(lines) {
  return lines.map((line) => {
    const details = [
      line.variantName ? `Color: ${escapeHtml(line.variantName)}` : null,
      line.size ? `Talle: ${escapeHtml(line.size)}` : null,
      line.code ? `SKU: ${escapeHtml(line.code)}` : null,
      `Precio unitario: ${escapeHtml(formatMoney(line.unitPrice))}`
    ].filter(Boolean);

    return `
      <tr>
        <td style="padding:16px 12px;border-bottom:1px solid #ddd;">
          <strong>${escapeHtml(line.name)}</strong><br>
          <span style="font-size:12px;color:#666;">
            ${details.join('<br>')}
          </span>
        </td>
        <td style="padding:16px 12px;border-bottom:1px solid #ddd;text-align:center;">
          ${line.quantity}
        </td>
        <td style="padding:16px 12px;border-bottom:1px solid #ddd;text-align:right;font-weight:700;">
          ${escapeHtml(formatMoney(line.subtotal))}
        </td>
      </tr>
    `;
  }).join('');
}

export function buildEmailHtml({
  customer,
  lines,
  recipient,
  companyConfig = defaultCompanyConfig
}) {
  const totals = buildOrderTotals(lines);
  const customerName = escapeHtml(customer.name);
  const customerEmail = escapeHtml(customer.email);
  const isOwner = recipient === 'owner';
  const title = isOwner
    ? `Nuevo pedido ${escapeHtml(companyConfig.catalogName)}`
    : '¡Recibimos tu pedido!';
  const intro = isOwner
    ? `Se registró un nuevo pedido desde el catálogo ${escapeHtml(companyConfig.catalogName)}.`
    : `Hola ${customerName}, recibimos correctamente tu pedido. Un asesor de ` +
      `${escapeHtml(companyConfig.companyName)} se comunicará con vos.`;
  const customerBlock = isOwner ? `
    <div style="margin:24px 0;padding:18px;background:#f5f5f5;">
      <h2>Datos del cliente</h2>
      <p><strong>Nombre:</strong> ${customerName}</p>
      <p><strong>Comercio:</strong> ${escapeHtml(customer.company)}</p>
      <p><strong>Teléfono:</strong> ${escapeHtml(customer.phone)}</p>
      <p><strong>Correo:</strong> ${customerEmail}</p>
      <p><strong>Ubicación:</strong>
        ${escapeHtml(customer.city)},
        ${escapeHtml(customer.province)}
      </p>
      <p><strong>Dirección:</strong>
        ${escapeHtml(customer.address || '-')}
      </p>
    </div>
  ` : '';

  return `
    <!doctype html>
    <html lang="es">
      <body style="margin:0;background:#efefef;font-family:Arial,sans-serif;color:#222;">
        <div style="max-width:760px;margin:0 auto;padding:24px 12px;">
          <div style="background:#0a0a0a;padding:22px 26px;color:white;">
            <div style="font-size:28px;font-weight:900;">HEAD</div>
            <div style="font-size:12px;letter-spacing:1.5px;color:#bbb;">
              REAL STEP · CATÁLOGO MAYORISTA
            </div>
          </div>
          <div style="background:white;padding:28px 26px;">
            <h1>${title}</h1>
            <p>${intro}</p>
            ${customerBlock}
            <h2>Detalle del pedido</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <thead>
                <tr style="background:#111;color:white;">
                  <th style="padding:12px;text-align:left;">Producto</th>
                  <th style="padding:12px;text-align:center;">Unidades</th>
                  <th style="padding:12px;text-align:right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${buildProductRowsHtml(lines)}</tbody>
            </table>
            <div style="margin:22px 0 0 auto;max-width:330px;background:#f5f5f5;padding:18px;">
              <p>Total de unidades: <strong>${totals.units}</strong></p>
              <p>Total estimado:
                <strong>${escapeHtml(formatMoney(totals.total))}</strong>
              </p>
            </div>
            <div style="margin-top:22px;padding:16px;border-left:4px solid #111;background:#f7f7f7;">
              <strong>Observaciones</strong><br>
              ${escapeHtml(customer.notes || 'Sin observaciones.')}
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export function buildOwnerParams({
  customer,
  lines,
  companyConfig = defaultCompanyConfig
}) {
  return {
    to_email: companyConfig.orderEmail,
    reply_to: customer.email.trim(),
    subject: `Nuevo pedido ${companyConfig.catalogName} - ${customer.company.trim()}`,
    email_html: buildEmailHtml({ customer, lines, recipient: 'owner', companyConfig }),
    customer_name: customer.name.trim()
  };
}

export function buildCustomerParams({
  customer,
  lines,
  companyConfig = defaultCompanyConfig
}) {
  return {
    to_email: customer.email.trim(),
    reply_to: companyConfig.orderEmail,
    subject: `Recibimos tu pedido ${companyConfig.catalogName} - ${companyConfig.companyName}`,
    email_html: buildEmailHtml({ customer, lines, recipient: 'customer', companyConfig }),
    customer_name: customer.name.trim()
  };
}

export function createEmailJsClient(client = emailjs) {
  return {
    send(serviceId, templateId, params, publicKey) {
      return client.send(serviceId, templateId, params, { publicKey });
    }
  };
}

function classifyFailure(stage, error, ownerSent) {
  const networkFailure =
    error?.status === 0 ||
    error?.name === 'TypeError' ||
    /network|fetch|offline/i.test(String(error?.message || error?.text || ''));
  return new CheckoutEmailError(
    stage,
    networkFailure ? 'Fallo de red durante el envío.' : `Falló el correo al ${stage === 'owner' ? 'propietario' : 'cliente'}.`,
    { cause: error, ownerSent, code: networkFailure ? 'network' : stage }
  );
}

export async function sendOrderEmails({
  customer,
  lines,
  ownerAlreadySent = false,
  client = createEmailJsClient(),
  delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  emailConfig = defaultEmailConfig,
  companyConfig = defaultCompanyConfig
}) {
  const validation = validateEmailConfig(emailConfig, companyConfig);
  if (!validation.valid) {
    throw new CheckoutEmailError(
      'configuration',
      'La configuración de EmailJS está incompleta.',
      { code: 'configuration', ownerSent: false }
    );
  }

  let ownerSent = ownerAlreadySent;
  if (!ownerSent) {
    try {
      await client.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        buildOwnerParams({ customer, lines, companyConfig }),
        emailConfig.publicKey
      );
      ownerSent = true;
    } catch (error) {
      throw classifyFailure('owner', error, false);
    }
    await delay(OWNER_TO_CUSTOMER_DELAY_MS);
  }

  try {
    await client.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      buildCustomerParams({ customer, lines, companyConfig }),
      emailConfig.publicKey
    );
  } catch (error) {
    throw classifyFailure('customer', error, ownerSent);
  }

  return { ownerSent: true, customerSent: true };
}

export function createSubmissionGuard() {
  let active = false;
  return {
    async run(task) {
      if (active) return { skipped: true };
      active = true;
      try {
        return await task();
      } finally {
        active = false;
      }
    },
    isActive() {
      return active;
    }
  };
}

export async function runCheckoutTransaction({ send, clearCart }) {
  const result = await send();
  clearCart();
  return result;
}
