export const PRODUCT_IMAGE_DERIVATIVE_WIDTHS = Object.freeze([200, 480, 800]);

export function getProductImageDerivativePath(sourcePath, width) {
  const normalized = sourcePath.replaceAll('\\', '/');
  const prefix = 'assets/products/';
  if (!normalized.startsWith(prefix) || normalized.includes('/../')) {
    throw new Error(`Ruta de imagen de producto inválida: ${sourcePath}`);
  }
  return `product-images/${normalized.slice(prefix.length)}.w${width}.webp`;
}

export function resolveProductImageDerivativeUrl(
  relativePath,
  baseUrl,
  documentBaseUrl = globalThis.document?.baseURI
) {
  if (!relativePath) return null;

  const environmentBase = documentBaseUrl || globalThis.location?.href || import.meta.url;
  const requestedBase = typeof baseUrl === 'string' || baseUrl instanceof URL
    ? baseUrl
    : environmentBase;
  const absoluteBase = new URL(requestedBase, environmentBase);

  return new URL(relativePath, absoluteBase).href;
}
