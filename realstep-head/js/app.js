window.RealStep = window.RealStep || {};

RealStep.addToCart = function(productId) {
  var product = RealStep.findProduct(productId);
  var hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  var size = hasSizes
    ? RealStep.state.selectedSizeByProduct[productId]
    : null;
  var quantity = RealStep.state.quantityByProduct[productId];

  if (hasSizes && !size) {
    RealStep.showToast('Elegí un talle antes de agregar.');
    return;
  }

  if (hasSizes && !RealStep.sizeIsAvailable(product, size)) {
    RealStep.showToast('El talle ' + size + ' se encuentra sin stock.');
    return;
  }

  var existing = RealStep.state.cart.find(function(item) {
    return item.productId === productId &&
      (!hasSizes || item.size === size);
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

    RealStep.state.cart.push(cartItem);
  }

  RealStep.saveCartToStorage(RealStep.state.cart);
  RealStep.renderCart();
  RealStep.showToast(
    product.name +
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

document.addEventListener('click', function(event) {
  var imageButton = event.target.closest('[data-image-product]');

  if (imageButton) {
    RealStep.state.selectedImageByProduct[
      imageButton.dataset.imageProduct
    ] = Number(imageButton.dataset.imageIndex);

    RealStep.renderCatalogSections();
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

    RealStep.state.cart = RealStep.state.cart.filter(function(item) {
      return !(
        item.productId === removeButton.dataset.removeProduct &&
        (
          removeSize === undefined
            ? !item.size
            : item.size === removeSize
        )
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

RealStep.renderCatalogSections();
RealStep.renderCart();
RealStep.renderCategoryIndex();
