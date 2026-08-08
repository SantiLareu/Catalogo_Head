import { createLineKey } from '../reducers/cartReducer.js';

export const CART_STORAGE_KEY = 'realstep-head-cart';

function normalizeQuantity(value) {
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return null;
  return Math.max(1, Math.floor(quantity));
}

export function sanitizeCart(value) {
  if (!Array.isArray(value)) return [];
  const lines = [];

  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue;
    if (typeof candidate.productId !== 'string') continue;

    const quantity = normalizeQuantity(candidate.quantity);
    if (quantity == null) continue;

    const hasVariant = Object.hasOwn(candidate, 'variantId');
    const hasSize = Object.hasOwn(candidate, 'size');
    if (hasVariant && typeof candidate.variantId !== 'string') continue;
    if (hasSize && typeof candidate.size !== 'string') continue;

    const line = { productId: candidate.productId };
    if (hasVariant) line.variantId = candidate.variantId;
    if (hasSize) line.size = candidate.size;
    line.quantity = quantity;
    if (Number.isFinite(candidate.priceSnapshot) && candidate.priceSnapshot >= 0) {
      line.priceSnapshot = candidate.priceSnapshot;
    }

    const existing = lines.find((item) => createLineKey(item) === createLineKey(line));
    if (existing) existing.quantity += line.quantity;
    else lines.push(line);
  }

  return lines;
}

export function readCart(storage) {
  try {
    const raw = storage?.getItem(CART_STORAGE_KEY);
    return sanitizeCart(raw == null ? [] : JSON.parse(raw));
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

export function removeCart(storage) {
  try {
    storage?.removeItem(CART_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
