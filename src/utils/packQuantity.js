export function getPackDe(product) {
  return Number.isInteger(product?.packDe) && product.packDe >= 1
    ? product.packDe
    : 1;
}

export function isPackQuantity(quantity, packDe) {
  return Number.isInteger(quantity) && quantity > 0 && quantity % packDe === 0;
}

export function nextPackQuantity(quantity, packDe) {
  if (!Number.isInteger(quantity) || quantity < 0) return packDe;
  return isPackQuantity(quantity, packDe)
    ? quantity + packDe
    : Math.ceil(quantity / packDe) * packDe;
}

export function previousPackQuantity(quantity, packDe) {
  if (!Number.isInteger(quantity) || quantity <= packDe) return 0;
  return isPackQuantity(quantity, packDe)
    ? quantity - packDe
    : Math.floor(quantity / packDe) * packDe;
}
