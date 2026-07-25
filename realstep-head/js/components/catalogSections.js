window.RealStep = window.RealStep || {};

RealStep.renderCatalogSections = function() {
  var container = document.getElementById('catalog-sections');
  var categories = Array.isArray(RealStep.categories)
    ? RealStep.categories
    : [];
  var products = Array.isArray(RealStep.products)
    ? RealStep.products
    : [];

  if (!container) {
    console.warn(
      'RealStep: no se encontró el contenedor #catalog-sections.'
    );
    return;
  }

  container.innerHTML = categories
    .filter(function(category) {
      return category.enabled;
    })
    .map(function(category) {
      var categoryProducts = products.filter(function(product) {
        return product.category === category.productCategory;
      });

      var productContent = categoryProducts.length
        ? categoryProducts.map(function(product) {
            return RealStep.renderProductCard(product);
          }).join('')
        : '<div class="empty"><strong>Próximamente</strong></div>';

      return `
        <section id="${category.target}">
          <div class="heading">
            <p class="ey">COLECCIÓN</p>
            <h2>${category.title}</h2>
            ${category.subtitle ? `<p>${category.subtitle}</p>` : ''}
          </div>
          <div class="list">${productContent}</div>
        </section>
      `;
    })
    .join('');
};
