window.RealStep = window.RealStep || {};

RealStep.renderCategoryIndex = function() {
  var container = document.getElementById('category-index-list');

  if (!container) {
    console.warn(
      'RealStep: no se encontró el contenedor #category-index-list.'
    );
    return;
  }

  var categories = Array.isArray(RealStep.categories)
    ? RealStep.categories
    : [];

  if (!categories.length) {
    console.warn(
      'RealStep: no hay categorías disponibles para renderizar.'
    );
    return;
  }

  container.className = 'category-index-list';
  container.innerHTML = categories.map(function(category) {
    return `
      <button
        type="button"
        class="category-index-item ${
          category.enabled ? 'enabled' : 'disabled'
        }"
        data-category-id="${category.id}"
        data-category-target="${category.target}"
        ${category.enabled ? '' : 'disabled'}
      >
        <span>${category.label}</span>
        ${
          category.enabled
            ? '<span class="category-index-arrow" aria-hidden="true">›</span>'
            : '<span class="category-index-status">Próximamente</span>'
        }
      </button>
    `;
  }).join('');

  container.onclick = function(event) {
    var item = event.target.closest(
      '.category-index-item.enabled'
    );

    if (!item || !container.contains(item)) {
      return;
    }

    var target = document.getElementById(
      item.dataset.categoryTarget
    );

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
};
