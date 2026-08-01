import {
  getEffectivePrice,
  getEffectiveSizes,
  getVariantById
} from '../data/catalogSelectors.js';

export const cartIssueMessages = {
  product_removed: 'El producto ya no está disponible en el catálogo.',
  variant_removed: 'La variante seleccionada ya no está disponible.',
  size_unavailable: 'El talle seleccionado ya no está disponible.',
  unavailable: 'La combinación seleccionada no tiene stock suficiente.',
  price_changed: 'El precio cambió. Revisá y aceptá el precio vigente para continuar.'
};

function getSizeIssue(size, quantity) {
  if (!size) return 'size_unavailable';
  if (Number.isFinite(size.stock)) {
    if (size.stock <= 0 || size.inStock === false) return 'size_unavailable';
    return size.stock >= quantity ? null : 'unavailable';
  }
  return size.inStock === true ? null : 'size_unavailable';
}

function reconcileLine(line, productById) {
  const product = productById.get(line.productId) || null;
  const issues = [];
  let variant = null;
  let currentPrice = null;

  if (!product || product.enabled === false) {
    issues.push('product_removed');
  } else {
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (line.variantId != null) {
      variant = getVariantById(product, line.variantId);
      if (!variant || variant.enabled === false) issues.push('variant_removed');
    } else if (variants.length > 0) {
      issues.push('variant_removed');
    }

    if (!issues.includes('variant_removed')) {
      const sizes = getEffectiveSizes(product, variant);
      if (line.size != null || sizes.length > 0) {
        const size = sizes.find((candidate) => candidate.size === line.size);
        const sizeIssue = getSizeIssue(size, line.quantity);
        if (sizeIssue) issues.push(sizeIssue);
      }

      currentPrice = getEffectivePrice(product, variant);
      if (
        Number.isFinite(line.priceSnapshot) &&
        Number.isFinite(currentPrice) &&
        line.priceSnapshot !== currentPrice
      ) {
        issues.push('price_changed');
      }
    }
  }

  return {
    line,
    product,
    variant,
    currentPrice,
    issues,
    status: issues[0] || 'available',
    requiresReview: issues.length > 0
  };
}

export function reconcileCart(lines = [], products = []) {
  const productById = new Map(products.map((product) => [product.id, product]));
  const entries = lines.map((line) => reconcileLine(line, productById));
  const units = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = entries.reduce(
    (sum, entry) => sum + (Number.isFinite(entry.currentPrice)
      ? entry.currentPrice * entry.line.quantity
      : 0),
    0
  );

  return {
    entries,
    units,
    total,
    hasChanges: entries.some((entry) => entry.requiresReview),
    checkoutBlocked: lines.length === 0 || entries.some((entry) => entry.requiresReview)
  };
}

export function initializePriceSnapshots(lines = [], products = []) {
  const report = reconcileCart(lines, products);
  return report.entries.map(({ line, currentPrice, issues }) => {
    if (
      Number.isFinite(line.priceSnapshot) ||
      !Number.isFinite(currentPrice) ||
      issues.some((issue) => issue !== 'price_changed')
    ) return line;
    return { ...line, priceSnapshot: currentPrice };
  });
}

export function acknowledgeCurrentPrice(line, products = []) {
  const report = reconcileCart([line], products);
  const currentPrice = report.entries[0]?.currentPrice;
  return Number.isFinite(currentPrice) ? { ...line, priceSnapshot: currentPrice } : line;
}
