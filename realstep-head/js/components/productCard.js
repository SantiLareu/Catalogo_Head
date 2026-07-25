window.RealStep = window.RealStep || {};

RealStep.renderProductCard = function(product) {
  var currentImage = RealStep.state.selectedImageByProduct[product.id];
  var selectedSize = RealStep.state.selectedSizeByProduct[product.id];
  var hasSizes = Array.isArray(product.sizes) && product.sizes.length > 0;
  var category = (RealStep.categories || []).find(function(item) {
    return item.productCategory === product.category;
  });
  var categoryLabel = category
    ? category.label
    : String(product.category || '').toUpperCase();

  return `
    <article class="product">
      <div class="gallery">
        <div class="mainimg">
          <img src="${product.images[currentImage]}" alt="${product.name}">
        </div>

        <div class="thumbs">
          ${product.images.map(function(image, index) {
            return `
              <button
                class="thumb ${index === currentImage ? 'active' : ''}"
                data-image-product="${product.id}"
                data-image-index="${index}"
                aria-label="Ver imagen ${index + 1}"
              >
                <img src="${image}" alt="${product.name} imagen ${index + 1}">
              </button>
            `;
          }).join('')}
        </div>
      </div>

      <div class="panel">
        <p class="ey">${categoryLabel}</p>
        <h2>${product.name}</h2>
        <p class="code">SKU ${product.code}</p>

        <div class="price">
          <span>Precio por unidad</span>
          <strong>${RealStep.formatMoney(product.price)}</strong>
        </div>

        ${hasSizes ? `
          <span class="label">Elegí el talle</span>

          <div class="sizes">
            ${product.sizes.map(function(size) {
              return `
                <button
                  class="size ${selectedSize === size.size ? 'sel' : ''}"
                  data-size-product="${product.id}"
                  data-size="${size.size}"
                  ${size.inStock ? '' : 'disabled'}
                >
                  ${size.size}
                  ${size.inStock ? '' : '<small>Sin stock</small>'}
                </button>
              `;
            }).join('')}
          </div>
        ` : ''}

        <span class="label">Cantidad</span>

        <div class="qty">
          <button data-qty="minus" data-product="${product.id}">−</button>
          <div class="qval" id="qty-${product.id}">
            ${RealStep.state.quantityByProduct[product.id]}
          </div>
          <button data-qty="plus" data-product="${product.id}">+</button>
        </div>

        <button class="primary" data-add="${product.id}">
          AGREGAR AL PEDIDO
        </button>
      </div>
    </article>
  `;
};
