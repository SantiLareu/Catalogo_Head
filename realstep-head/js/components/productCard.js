window.RealStep = window.RealStep || {};

RealStep.renderProductCard = function(product) {
  var variants = Array.isArray(product.variants)
    ? product.variants
    : [];
  var selectedVariant = RealStep.getSelectedVariant(product);
  var images = selectedVariant && Array.isArray(selectedVariant.images)
    ? selectedVariant.images
    : (Array.isArray(product.images) ? product.images : []);
  var sizes = selectedVariant && Array.isArray(selectedVariant.sizes)
    ? selectedVariant.sizes
    : (Array.isArray(product.sizes) ? product.sizes : []);
  var code = selectedVariant ? selectedVariant.code : product.code;
  var price = RealStep.getEffectivePrice(
    product,
    selectedVariant ? selectedVariant.id : null
  );
  var currentImage = RealStep.state.selectedImageByProduct[product.id];
  var selectedSize = RealStep.state.selectedSizeByProduct[product.id];
  var hasSizes = sizes.length > 0;
  var category = (RealStep.categories || []).find(function(item) {
    return item.productCategory === product.category;
  });
  var categoryLabel = category
    ? category.label
    : String(product.category || '').toUpperCase();

  if (currentImage < 0 || currentImage >= images.length) {
    currentImage = 0;
    RealStep.state.selectedImageByProduct[product.id] = 0;
  }

  return `
    <article class="product product--${product.category || 'general'}">
      <div class="gallery">
        <div class="mainimg">
          ${images.length ? `
            <img src="${images[currentImage]}" alt="${product.name}">
          ` : ''}
        </div>

        <div class="thumbs">
          ${images.map(function(image, index) {
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
        <p class="code">SKU ${code || '-'}</p>

        <div class="price">
          <span>Precio por unidad</span>
          <strong>${RealStep.formatMoney(price)}</strong>
        </div>

        ${variants.length ? `
          <div class="variant-selector">
            <span class="label">
              Elegí el color
              <strong class="variant-current">
                ${selectedVariant ? selectedVariant.colorName : ''}
              </strong>
            </span>

            <div class="variant-swatches" role="group" aria-label="Colores disponibles">
              ${variants.map(function(variant) {
                var isSelected =
                  selectedVariant && selectedVariant.id === variant.id;
                var swatchStyle = variant.thumbnail
                  ? `background-image:url('${variant.thumbnail}')`
                  : `background-color:${variant.colorHex || '#d8d8d8'}`;

                return `
                  <button
                    class="variant-swatch ${isSelected ? 'selected' : ''} ${variant.thumbnail ? 'has-thumbnail' : ''}"
                    style="${swatchStyle}"
                    data-variant-product="${product.id}"
                    data-variant-id="${variant.id}"
                    title="${variant.colorName}"
                    aria-label="Elegir color ${variant.colorName}"
                    aria-pressed="${isSelected ? 'true' : 'false'}"
                  >
                    <span class="sr-only">${variant.colorName}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        ${hasSizes ? `
          <span class="label">Elegí el talle</span>

          <div class="sizes">
            ${sizes.map(function(size) {
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

        ${product.specifications ? `
          <section class="product-specifications" aria-label="Ficha técnica">
            <h3>Ficha técnica</h3>

            ${product.specifications.fit ? `
              <div class="specification-row">
                <strong>FIT</strong>
                <span>${product.specifications.fit}</span>
              </div>
            ` : ''}

            ${product.specifications.mainFabric ? `
              <div class="specification-row">
                <strong>MAIN FABRIC</strong>
                <span>${product.specifications.mainFabric}</span>
              </div>
            ` : ''}

            ${product.specifications.secondFabric ? `
              <div class="specification-row">
                <strong>2ND FABRIC</strong>
                <span>${product.specifications.secondFabric}</span>
              </div>
            ` : ''}

            ${Array.isArray(product.specifications.features) &&
              product.specifications.features.length ? `
              <div class="specification-row specification-features">
                <strong>FEATURES</strong>
                <ul>
                  ${product.specifications.features.map(function(feature) {
                    return `<li>${feature}</li>`;
                  }).join('')}
                </ul>
              </div>
            ` : ''}
          </section>
        ` : ''}
      </div>
    </article>
  `;
};
