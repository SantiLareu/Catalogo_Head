import {
  getEffectiveCode,
  getPrimaryImagePath,
  getVariantById
} from '../data/catalogSelectors.js';

export function resolveCartItemPresentation(entry, previous = {}) {
  const { issues, line, product, variant } = entry;
  const displayVariant = variant || (
    product && line.variantId != null
      ? getVariantById(product, line.variantId)
      : null
  );
  const structurallyInvalid = (
    !product ||
    product.enabled === false ||
    issues.includes('variant_removed')
  );
  const currentImagePath = product
    ? getPrimaryImagePath(product, displayVariant)
    : null;
  const currentCode = product
    ? getEffectiveCode(product, displayVariant) || null
    : null;

  return {
    name: product?.name || previous.name || `Producto ${line.productId}`,
    variantName: displayVariant?.colorName || (
      structurallyInvalid ? previous.variantName || null : null
    ),
    code: structurallyInvalid
      ? previous.code || currentCode
      : currentCode,
    imagePath: structurallyInvalid
      ? previous.imagePath || currentImagePath
      : currentImagePath || previous.imagePath || null
  };
}
