import derivativeManifest from '../../generated/product-image-derivatives.json';
import {
  getProductImageDerivativePath,
  resolveProductImageDerivativeUrl
} from './productImageDerivativePaths.js';

const productImageUrls = import.meta.glob('../../assets/products/**/*', {
  eager: true,
  import: 'default',
  query: '?url'
});

export function resolveProductImage(imagePath) {
  if (!imagePath) {
    return null;
  }

  return productImageUrls[`../../${imagePath}`] || null;
}

export function resolveProductImageSources(imagePath, baseUrl) {
  const original = resolveProductImage(imagePath);
  if (!original) return null;
  const manifestEntry = derivativeManifest.images?.[imagePath];
  const cacheKey = manifestEntry?.sha256;
  const resolveVariant = (width) => {
    const hasVariant =
      manifestEntry && manifestEntry.width > width;
    const relativePath = hasVariant
      ? getProductImageDerivativePath(imagePath, width)
      : null;
    const url = resolveProductImageDerivativeUrl(relativePath, baseUrl);
    return url && cacheKey ? `${url}?v=${cacheKey}` : url;
  };
  const thumbnail = resolveVariant(200) || original;
  const small = resolveVariant(480);
  const medium = resolveVariant(800);
  const responsiveCandidates = [
    small ? `${small} 480w` : null,
    medium ? `${medium} 800w` : null
  ].filter(Boolean);

  return {
    original,
    thumbnail,
    card: medium || small || original,
    srcSet: responsiveCandidates.length ? responsiveCandidates.join(', ') : undefined
  };
}
