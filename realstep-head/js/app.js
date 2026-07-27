window.RealStep = window.RealStep || {};

RealStep.addToCart = function(productId) {
  var product = RealStep.findProduct(productId);
  var selectedVariant = RealStep.getSelectedVariant(product);
  var variantId = selectedVariant ? selectedVariant.id : null;
  var sizes = selectedVariant && Array.isArray(selectedVariant.sizes)
    ? selectedVariant.sizes
    : (Array.isArray(product.sizes) ? product.sizes : []);
  var hasSizes = sizes.length > 0;
  var size = hasSizes
    ? RealStep.state.selectedSizeByProduct[productId]
    : null;
  var quantity = RealStep.state.quantityByProduct[productId];

  if (hasSizes && !size) {
    RealStep.showToast('Elegí un talle antes de agregar.');
    return;
  }

  if (
    hasSizes &&
    !RealStep.sizeIsAvailable(product, size, variantId)
  ) {
    RealStep.showToast('El talle ' + size + ' se encuentra sin stock.');
    return;
  }

  var existing = RealStep.state.cart.find(function(item) {
    return item.productId === productId &&
      (item.variantId || null) === variantId &&
      (item.size || null) === size;
  });

  if (existing) {
    existing.quantity += quantity;
  } else {
    var cartItem = {
      productId: productId,
      quantity: quantity
    };

    if (hasSizes) {
      cartItem.size = size;
    }

    if (variantId) {
      cartItem.variantId = variantId;
    }

    RealStep.state.cart.push(cartItem);
  }

  RealStep.saveCartToStorage(RealStep.state.cart);
  RealStep.renderCart();
  RealStep.showToast(
    product.name +
    (selectedVariant ? ' color ' + selectedVariant.colorName : '') +
    (hasSizes ? ' talle ' + size : '') +
    ' agregado'
  );
};

RealStep.openCart = function() {
  document.getElementById('drawer').classList.add('open');
};

RealStep.closeCart = function() {
  document.getElementById('drawer').classList.remove('open');
};

RealStep.openCheckout = function() {
  if (!RealStep.state.cart.length) {
    RealStep.showToast('Agregá al menos un producto al pedido.');
    return;
  }

  RealStep.closeCart();

  var totals = RealStep.getTotals();

  document.getElementById('preview').innerHTML = `
    <strong>${totals.units} unidades</strong><br>
    Total estimado: ${RealStep.formatMoney(totals.total)}
  `;

  document.getElementById('modal').classList.add('open');
};

RealStep.closeCheckout = function() {
  document.getElementById('modal').classList.remove('open');
};

RealStep.findProductGallery = function(productId) {
  return Array.prototype.find.call(
    document.querySelectorAll('[data-gallery-product]'),
    function(gallery) {
      return gallery.dataset.galleryProduct === productId;
    }
  ) || null;
};

RealStep.selectProductImage = function(
  productId,
  imageIndex,
  focusTarget
) {
  var product = RealStep.findProduct(productId);
  var images = product ? RealStep.getProductImages(product) : [];

  if (!images.length) {
    return;
  }

  var normalizedIndex =
    ((imageIndex % images.length) + images.length) % images.length;

  RealStep.state.selectedImageByProduct[productId] = normalizedIndex;
  RealStep.renderCatalogSections();

  var gallery = RealStep.findProductGallery(productId);

  if (!gallery) {
    return;
  }

  var activeThumb = gallery.querySelector('.thumb.active');
  var thumbRow = gallery.querySelector('.thumbs');

  if (activeThumb && thumbRow) {
    var thumbRect = activeThumb.getBoundingClientRect();
    var rowRect = thumbRow.getBoundingClientRect();
    var targetLeft =
      thumbRow.scrollLeft +
      thumbRect.left -
      rowRect.left -
      (thumbRow.clientWidth - activeThumb.offsetWidth) / 2;

    thumbRow.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: 'smooth'
    });
  }

  var elementToFocus = null;

  if (focusTarget === 'gallery') {
    elementToFocus = gallery;
  } else if (focusTarget) {
    elementToFocus = gallery.querySelector(focusTarget);
  }

  if (elementToFocus) {
    elementToFocus.focus({
      preventScroll: true
    });
  }
};

RealStep.changeProductImage = function(
  productId,
  direction,
  focusTarget
) {
  var currentImage =
    RealStep.state.selectedImageByProduct[productId] || 0;

  RealStep.selectProductImage(
    productId,
    currentImage + direction,
    focusTarget
  );
};

document.addEventListener('click', function(event) {
  var variantButton = event.target.closest('[data-variant-product]');

  if (variantButton) {
    var variantProductId = variantButton.dataset.variantProduct;
    var variantProduct = RealStep.findProduct(variantProductId);
    var variant = RealStep.findVariant(
      variantProduct,
      variantButton.dataset.variantId
    );

    if (variant) {
      RealStep.state.selectedVariantByProduct[variantProductId] =
        variant.id;
      RealStep.state.selectedImageByProduct[variantProductId] = 0;
      RealStep.state.selectedSizeByProduct[variantProductId] = null;
      RealStep.renderCatalogSections();
    }

    return;
  }

  var imageNavigation = event.target.closest('[data-image-nav]');

  if (imageNavigation) {
    var navigationDirection =
      imageNavigation.dataset.imageNav === 'next' ? 1 : -1;

    RealStep.changeProductImage(
      imageNavigation.dataset.imageProduct,
      navigationDirection,
      '[data-image-nav="' +
        imageNavigation.dataset.imageNav +
      '"]'
    );
    return;
  }

  var imageButton = event.target.closest('[data-image-product]');

  if (imageButton) {
    RealStep.selectProductImage(
      imageButton.dataset.imageProduct,
      Number(imageButton.dataset.imageIndex),
      '.thumb.active'
    );
    return;
  }

  var sizeButton = event.target.closest('[data-size-product]');

  if (sizeButton) {
    RealStep.state.selectedSizeByProduct[
      sizeButton.dataset.sizeProduct
    ] = sizeButton.dataset.size;

    RealStep.renderCatalogSections();
    return;
  }

  var quantityButton = event.target.closest('[data-qty]');

  if (quantityButton) {
    var productId = quantityButton.dataset.product;
    var adjustment =
      quantityButton.dataset.qty === 'plus' ? 1 : -1;

    RealStep.state.quantityByProduct[productId] = Math.max(
      1,
      RealStep.state.quantityByProduct[productId] + adjustment
    );

    document.getElementById('qty-' + productId).textContent =
      RealStep.state.quantityByProduct[productId];
  }

  var addButton = event.target.closest('[data-add]');

  if (addButton) {
    RealStep.addToCart(addButton.dataset.add);
  }

  var removeButton = event.target.closest('[data-remove-product]');

  if (removeButton) {
    var removeSize = removeButton.dataset.removeSize;
    var removeVariant = removeButton.dataset.removeVariant;

    RealStep.state.cart = RealStep.state.cart.filter(function(item) {
      return !(
        item.productId === removeButton.dataset.removeProduct &&
        (item.variantId || null) === (removeVariant || null) &&
        (item.size || null) === (removeSize || null)
      );
    });

    RealStep.saveCartToStorage(RealStep.state.cart);
    RealStep.renderCart();
  }

  if (event.target.closest('[data-close]')) {
    RealStep.closeCart();
  }

  if (event.target.closest('[data-close-modal]')) {
    RealStep.closeCheckout();
  }
});

document.addEventListener('keydown', function(event) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return;
  }

  var target = event.target;

  if (!target || typeof target.closest !== 'function') {
    return;
  }

  var tagName = target.tagName;

  if (
    target.isContentEditable ||
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    tagName === 'SELECT'
  ) {
    return;
  }

  var gallery = target.closest('[data-gallery-product]');

  if (!gallery) {
    return;
  }

  event.preventDefault();

  RealStep.changeProductImage(
    gallery.dataset.galleryProduct,
    event.key === 'ArrowRight' ? 1 : -1,
    'gallery'
  );
});

RealStep.scrollToFirstCatalogSection = function() {
  var category = RealStep.categories.find(function(item) {
    return item.enabled;
  });
  var target = category && document.getElementById(category.target);

  if (target) {
    target.scrollIntoView({
      behavior: 'smooth'
    });
  }
};

document.getElementById('open').addEventListener('click', RealStep.openCart);
var heroGoButton = document.getElementById('heroGo');

if (heroGoButton) {
  heroGoButton.addEventListener(
    'click',
    RealStep.scrollToFirstCatalogSection
  );
}
document.getElementById('checkout').addEventListener(
  'click',
  RealStep.openCheckout
);

document.getElementById('form').addEventListener(
  'submit',
  async function(event) {
    event.preventDefault();

    var formElement = event.currentTarget;
    var submitButton =
      formElement.querySelector('button[type="submit"]');
    var originalLabel = submitButton.textContent;

    submitButton.disabled = true;
    submitButton.textContent = 'ENVIANDO PEDIDO...';

    try {
      var form = new FormData(formElement);

      await RealStep.sendOrderEmails(form);

      RealStep.state.cart = [];
      RealStep.saveCartToStorage(RealStep.state.cart);
      RealStep.renderCart();
      formElement.reset();
      RealStep.closeCheckout();
      RealStep.showToast(
        'Pedido enviado correctamente. Revisá tu correo.'
      );
    } catch (error) {
      console.error(error);
      RealStep.showToast(
        'No pudimos enviar el pedido. Intentá nuevamente.'
      );
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalLabel;
    }
  }
);

RealStep.initLightbox();
RealStep.renderCatalogSections();
RealStep.renderCart();
RealStep.renderCategoryIndex();
