const productImageUrls = import.meta.glob('../../../assets/products/**/*', {
  eager: true,
  import: 'default',
  query: '?url'
});

export function resolveProductImage(imagePath) {
  if (!imagePath) {
    return null;
  }

  return productImageUrls[`../../../${imagePath}`] || null;
}
