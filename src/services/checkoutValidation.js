import { createLineKey } from '../reducers/cartReducer.js';
import { buildOrderLines } from './emailService.js';
import { formatMoney } from '../utils/money.js';

const issueLabels = {
  product_removed: 'El producto ya no está disponible.',
  variant_removed: 'La variante seleccionada ya no está disponible.',
  size_unavailable: 'El talle seleccionado ya no está disponible.',
  unavailable: 'La combinación seleccionada ya no tiene disponibilidad.',
  pack_invalid: 'La cantidad no respeta el pack de venta vigente.',
  price_changed: 'El precio vigente requiere aceptación.'
};

export const CHECKOUT_CATALOG_UNAVAILABLE_MESSAGE =
  'No pudimos verificar la última disponibilidad del catálogo. Intentá nuevamente en unos segundos.';

function orderLineKey(line) {
  return createLineKey(line);
}

function displayName(previous, current, cartLine) {
  return current?.name || previous?.name || `Producto ${cartLine.productId}`;
}

function describeValue(value) {
  return value == null || value === '' ? 'sin dato' : String(value);
}

export function createCheckoutOrderSnapshot(cart, products) {
  return buildOrderLines(cart, products);
}

export function compareCheckoutOrder({ previousLines = [], currentLines = [], reconciliation }) {
  const previousByKey = new Map(previousLines.map((line) => [orderLineKey(line), line]));
  const currentByKey = new Map(currentLines.map((line) => [orderLineKey(line), line]));
  const changes = [];

  for (const entry of reconciliation.entries) {
    const key = orderLineKey(entry.line);
    const previous = previousByKey.get(key);
    const current = currentByKey.get(key);
    const name = displayName(previous, current, entry.line);

    for (const issue of entry.issues) {
      if (issue === 'price_changed') {
        changes.push({
          key: `${key}:price`,
          kind: 'price_changed',
          label: name,
          message: `Precio actualizado: ${formatMoney(entry.line.priceSnapshot)} → ${formatMoney(entry.currentPrice)}`
        });
      } else {
        changes.push({
          key: `${key}:${issue}`,
          kind: issue,
          label: name,
          message: issueLabels[issue] || 'El artículo requiere revisión.'
        });
      }
    }

    if (
      !previous ||
      !current ||
      entry.issues.includes('product_removed') ||
      entry.issues.includes('variant_removed')
    ) continue;
    const fields = [
      ['name', 'Nombre'],
      ['code', 'SKU'],
      ['variantName', 'Color']
    ];
    for (const [field, label] of fields) {
      if (previous[field] === current[field]) continue;
      changes.push({
        key: `${key}:${field}`,
        kind: `${field}_changed`,
        label: name,
        message: `${label}: ${describeValue(previous[field])} → ${describeValue(current[field])}`
      });
    }

    if (
      previous.unitPrice !== current.unitPrice &&
      !entry.issues.includes('price_changed')
    ) {
      changes.push({
        key: `${key}:resolved-price`,
        kind: 'price_changed',
        label: name,
        message: `Precio actualizado: ${formatMoney(previous.unitPrice)} → ${formatMoney(current.unitPrice)}`
      });
    }
  }

  return changes;
}

export async function validateCheckoutSubmission({
  cart,
  checkCatalog,
  reviewedLines
}) {
  let validation;
  try {
    validation = await checkCatalog({ force: true, fresh: true, notify: false });
  } catch {
    return {
      allowSend: false,
      reason: 'catalog_unavailable',
      message: CHECKOUT_CATALOG_UNAVAILABLE_MESSAGE,
      changes: [],
      reviewedLines
    };
  }
  if (!validation.valid) {
    return {
      allowSend: false,
      reason: 'catalog_unavailable',
      message: CHECKOUT_CATALOG_UNAVAILABLE_MESSAGE,
      changes: [],
      reviewedLines
    };
  }

  const currentLines = createCheckoutOrderSnapshot(cart, validation.catalog.products);
  const changes = compareCheckoutOrder({
    previousLines: reviewedLines,
    currentLines,
    reconciliation: validation.reconciliation
  });

  if (validation.reconciliation.checkoutBlocked || changes.length > 0) {
    return {
      allowSend: false,
      reason: 'order_changed',
      message: 'El catálogo cambió desde tu última revisión.',
      changes,
      reviewedLines: currentLines,
      validation
    };
  }

  return {
    allowSend: true,
    reason: 'current',
    message: '',
    changes: [],
    orderLines: currentLines,
    reviewedLines: currentLines,
    validation
  };
}
