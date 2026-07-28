import { getEffectiveSizes, getVariantById } from '../data/catalogSelectors.js';
import { createLineKey } from '../reducers/cartReducer.js';

export const CART_STORAGE_KEY = 'realstep-head-cart';

function normalizeQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return null;
  return Math.max(1, Math.floor(quantity));
}

export function sanitizeCart(value, products = []) {
  if (!Array.isArray(value)) return [];
  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    if (typeof candidate.productId !== 'string') continue;

    const product = productById.get(candidate.productId);
    const quantity = normalizeQuantity(candidate.quantity);
    if (!product || quantity == null) continue;

    const hasVariant = Object.hasOwn(candidate, 'variantId');
    const hasSize = Object.hasOwn(candidate, 'size');
    if (hasVariant && typeof candidate.variantId !== 'string') continue;
    if (hasSize && typeof candidate.size !== 'string') continue;

    const variants = Array.isArray(product.variants) ? product.variants : [];
    const variant = hasVariant ? getVariantById(product, candidate.variantId) : null;
    if ((variants.length > 0 && !variant) || (variants.length === 0 && hasVariant)) continue;

    const sizes = getEffectiveSizes(product, variant);
    if (
      (sizes.length > 0 && (!hasSize || !sizes.some((item) => item.size === candidate.size))) ||
      (sizes.length === 0 && hasSize)
    ) continue;

    const line = { productId: candidate.productId };
    if (hasVariant) line.variantId = candidate.variantId;
    if (hasSize) line.size = candidate.size;
    line.quantity = quantity;

    const existing = lines.find((item) => createLineKey(item) === createLineKey(line));
    if (existing) existing.quantity += line.quantity;
    else lines.push(line);
  }

  return lines;
}

export function readCart(storage, products) {
  try {
    const raw = storage?.getItem(CART_STORAGE_KEY);
    return sanitizeCart(raw == null ? [] : JSON.parse(raw), products);
  } catch {
    return [];
  }
}

export function writeCart(storage, lines) {
  try {
    storage?.setItem(CART_STORAGE_KEY, JSON.stringify(lines));
    return true;
  } catch {
    return false;
  }
}

