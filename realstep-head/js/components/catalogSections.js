window.RealStep = window.RealStep || {};

RealStep.getCatalogSections = function(categories) {
  var sections = [];

  categories.forEach(function(category) {
    if (!category.enabled) {
      return;
    }

    if (
      Array.isArray(category.children) &&
      category.children.length
    ) {
      category.children.forEach(function(child) {
        if (child.enabled !== false) {
          sections.push(child);
        }
      });
      return;
    }

    sections.push(category);
  });

  return sections;
};

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

  container.innerHTML = RealStep.getCatalogSections(categories)
    .map(function(category) {
      var sourceProducts = category.dataSource
        ? RealStep[category.dataSource]
        : null;
      var categoryProducts = Array.isArray(sourceProducts)
        ? sourceProducts
        : products.filter(function(product) {
            return product.category === category.productCategory;
          });

      var productContent = categoryProducts.length
        ? categoryProducts.map(function(product) {
            return RealStep.renderProductCard(product);
          }).join('')
        : '<div class="empty"><strong>Próximamente</strong></div>';

      return `
        <section
          id="${category.target}"
          data-catalog-category="${category.id}"
        >
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
