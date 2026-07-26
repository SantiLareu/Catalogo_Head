window.RealStep = window.RealStep || {};

RealStep.state = {
  cart: RealStep.loadCart(),
  selectedSizeByProduct: {},
  selectedVariantByProduct: {},
  quantityByProduct: {},
  selectedImageByProduct: {}
};

RealStep.products.forEach(function(product) {
  var variants = Array.isArray(product.variants)
    ? product.variants
    : [];

  RealStep.state.selectedSizeByProduct[product.id] = null;
  RealStep.state.selectedVariantByProduct[product.id] =
    variants.length ? variants[0].id : null;
  RealStep.state.quantityByProduct[product.id] = 1;
  RealStep.state.selectedImageByProduct[product.id] = 0;
});

RealStep.findProduct = function(productId) {
  return RealStep.products.find(function(product) {
    return product.id === productId;
  });
};

RealStep.findVariant = function(product, variantId) {
  var variants = product && Array.isArray(product.variants)
    ? product.variants
    : [];

  return variants.find(function(variant) {
    return variant.id === variantId;
  }) || null;
};

RealStep.getSelectedVariant = function(product) {
  if (!product) {
    return null;
  }

  return RealStep.findVariant(
    product,
    RealStep.state.selectedVariantByProduct[product.id]
  );
};

RealStep.getEffectivePrice = function(product, variantId) {
  var variant = RealStep.findVariant(product, variantId);

  return variant && typeof variant.price === 'number'
    ? variant.price
    : product.price;
};

RealStep.sizeIsAvailable = function(product, size, variantId) {
  var variant = RealStep.findVariant(product, variantId);
  var sizes = variant && Array.isArray(variant.sizes)
    ? variant.sizes
    : product.sizes;

  return Array.isArray(sizes) && sizes.some(function(item) {
    return item.size === size && item.inStock;
  });
};
