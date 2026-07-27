window.RealStep = window.RealStep || {};

RealStep.categoryIndexOpen = RealStep.categoryIndexOpen || {};
RealStep.categoryHashHandled = false;

RealStep.navigateToCategoryTarget = function(targetId, updateHash) {
  var target = document.getElementById(targetId);

  if (!target) {
    return;
  }

  if (updateHash) {
    try {
      history.replaceState(null, '', '#' + targetId);
    } catch (error) {
      location.hash = targetId;
    }
  }

  target.scrollIntoView({
    behavior: 'smooth'
  });
};

RealStep.openParentForHash = function(categories) {
  var hash = decodeURIComponent(location.hash.slice(1));

  if (!hash) {
    return;
  }

  categories.forEach(function(category) {
    var children = Array.isArray(category.children)
      ? category.children
      : [];
    var containsTarget = children.some(function(child) {
      return child.target === hash;
    });

    if (containsTarget) {
      RealStep.categoryIndexOpen[category.id] = true;
    }
  });
};

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

  RealStep.openParentForHash(categories);
  container.className = 'category-index-list';
  container.innerHTML = categories.map(function(category) {
    var children = Array.isArray(category.children)
      ? category.children
      : [];

    if (children.length) {
      var submenuId = 'category-submenu-' + category.id;
      var isOpen = !!RealStep.categoryIndexOpen[category.id];

      return `
        <div class="category-index-group">
          <button
            type="button"
            class="category-index-item category-index-toggle enabled"
            data-category-toggle="${category.id}"
            aria-expanded="${isOpen ? 'true' : 'false'}"
            aria-controls="${submenuId}"
          >
            <span>${category.label}</span>
            <span
              class="category-index-arrow"
              aria-hidden="true"
            >›</span>
          </button>

          <div
            class="category-index-submenu ${isOpen ? 'open' : ''}"
            id="${submenuId}"
            style="--category-submenu-count:${children.length}"
            aria-hidden="${isOpen ? 'false' : 'true'}"
            ${isOpen ? '' : 'inert'}
          >
            ${children.map(function(child) {
              var isEnabled = child.enabled !== false;

              return `
                <button
                  type="button"
                  class="category-index-subitem ${
                    isEnabled ? 'enabled' : 'disabled'
                  }"
                  data-category-target="${child.target}"
                  data-category-id="${child.id}"
                  ${isEnabled ? '' : 'disabled'}
                  ${isOpen && isEnabled ? '' : 'tabindex="-1"'}
                >
                  <span>${child.label}</span>
                  ${
                    isEnabled
                      ? '<span class="category-index-arrow" aria-hidden="true">›</span>'
                      : '<span class="category-index-status">Próximamente</span>'
                  }
                </button>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

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
    var toggle = event.target.closest('[data-category-toggle]');

    if (toggle && container.contains(toggle)) {
      var categoryId = toggle.dataset.categoryToggle;
      var submenu = document.getElementById(
        toggle.getAttribute('aria-controls')
      );
      var willOpen =
        toggle.getAttribute('aria-expanded') !== 'true';

      RealStep.categoryIndexOpen[categoryId] = willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
      submenu.classList.toggle('open', willOpen);
      submenu.setAttribute(
        'aria-hidden',
        willOpen ? 'false' : 'true'
      );
      submenu.toggleAttribute('inert', !willOpen);

      Array.prototype.forEach.call(
        submenu.querySelectorAll('.category-index-subitem.enabled'),
        function(item) {
          item.tabIndex = willOpen ? 0 : -1;
        }
      );
      return;
    }

    var item = event.target.closest(
      '[data-category-target].enabled'
    );

    if (!item || !container.contains(item)) {
      return;
    }

    RealStep.navigateToCategoryTarget(
      item.dataset.categoryTarget,
      true
    );
  };

  if (!RealStep.categoryHashHandled && location.hash) {
    RealStep.categoryHashHandled = true;

    requestAnimationFrame(function() {
      RealStep.navigateToCategoryTarget(
        decodeURIComponent(location.hash.slice(1)),
        false
      );
    });
  }
};
