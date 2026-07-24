window.RealStep = window.RealStep || {};

RealStep.state = {
  cart: RealStep.loadCart(),
  selectedSizeByProduct: {},
  quantityByProduct: {},
  selectedImageByProduct: {}
};

RealStep.products.forEach(function(product) {
  RealStep.state.selectedSizeByProduct[product.id] = null;
  RealStep.state.quantityByProduct[product.id] = 1;
  RealStep.state.selectedImageByProduct[product.id] = 0;
});

RealStep.findProduct = function(productId) {
  return RealStep.products.find(function(product) {
    return product.id === productId;
  });
};

RealStep.sizeIsAvailable = function(product, size) {
  return product.sizes.some(function(item) {
    return item.size === size && item.inStock;
  });
};
