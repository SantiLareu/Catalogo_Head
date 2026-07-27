window.RealStep = window.RealStep || {};

RealStep.lightboxState = {
  initialized: false,
  open: false,
  productId: null,
  origin: null,
  scrollY: 0,
  zoom: 1,
  panX: 0,
  panY: 0,
  pointers: {},
  pointerStarts: {},
  pinchDistance: 0,
  pinchZoom: 1,
  lastTapTime: 0,
  lastTouchZoomAt: 0,
  inertElements: [],
  bodyStyles: null,
  closeTimer: null
};

RealStep.getLightboxElements = function() {
  var root = document.getElementById('product-lightbox');

  return {
    root: root,
    image: root && root.querySelector('[data-lightbox-image]'),
    viewport: root && root.querySelector('.lightbox-viewport'),
    previous: root && root.querySelector('[data-lightbox-nav="previous"]'),
    next: root && root.querySelector('[data-lightbox-nav="next"]'),
    counter: root && root.querySelector('[data-lightbox-counter]'),
    close: root && root.querySelector('[data-lightbox-close]')
  };
};

RealStep.resetLightboxTransform = function() {
  var state = RealStep.lightboxState;

  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  RealStep.applyLightboxTransform();
};

RealStep.clampLightboxPan = function() {
  var state = RealStep.lightboxState;
  var elements = RealStep.getLightboxElements();

  if (!elements.viewport) {
    return;
  }

  var limitX =
    elements.viewport.clientWidth * (state.zoom - 1) / 2;
  var limitY =
    elements.viewport.clientHeight * (state.zoom - 1) / 2;

  state.panX = Math.max(-limitX, Math.min(limitX, state.panX));
  state.panY = Math.max(-limitY, Math.min(limitY, state.panY));
};

RealStep.applyLightboxTransform = function() {
  var state = RealStep.lightboxState;
  var elements = RealStep.getLightboxElements();

  if (!elements.image) {
    return;
  }

  RealStep.clampLightboxPan();

  elements.image.style.transform =
    'translate3d(' + state.panX + 'px,' +
    state.panY + 'px,0) scale(' + state.zoom + ')';
  elements.image.classList.toggle(
    'zoomed',
    state.zoom > 1
  );
};

RealStep.setLightboxZoom = function(zoom) {
  var state = RealStep.lightboxState;

  state.zoom = Math.max(1, Math.min(4, zoom));

  if (state.zoom === 1) {
    state.panX = 0;
    state.panY = 0;
  }

  RealStep.applyLightboxTransform();
};

RealStep.renderLightboxImage = function() {
  var state = RealStep.lightboxState;
  var elements = RealStep.getLightboxElements();
  var product = RealStep.findProduct(state.productId);
  var images = product ? RealStep.getProductImages(product) : [];

  if (!elements.root || !product || !images.length) {
    return;
  }

  var currentImage =
    RealStep.state.selectedImageByProduct[state.productId] || 0;

  elements.image.src = images[currentImage];
  elements.image.alt =
    product.name + ' imagen ' + (currentImage + 1);
  elements.previous.hidden = images.length <= 1;
  elements.next.hidden = images.length <= 1;
  elements.counter.textContent =
    (currentImage + 1) + ' / ' + images.length;
};

RealStep.lockLightboxBackground = function() {
  var state = RealStep.lightboxState;
  var root = document.getElementById('product-lightbox');

  state.inertElements = [];

  Array.prototype.forEach.call(
    document.body.children,
    function(element) {
      if (element === root || element.tagName === 'SCRIPT') {
        return;
      }

      state.inertElements.push({
        element: element,
        inert: element.hasAttribute('inert'),
        ariaHidden: element.getAttribute('aria-hidden')
      });

      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
    }
  );

  state.bodyStyles = {
    position: document.body.style.position,
    top: document.body.style.top,
    left: document.body.style.left,
    right: document.body.style.right,
    width: document.body.style.width,
    overflow: document.body.style.overflow,
    scrollBehavior:
      document.documentElement.style.scrollBehavior
  };

  document.body.style.position = 'fixed';
  document.body.style.top = '-' + state.scrollY + 'px';
  document.body.style.left = '0';
  document.body.style.right = '0';
  document.body.style.width = '100%';
  document.body.style.overflow = 'hidden';
};

RealStep.unlockLightboxBackground = function() {
  var state = RealStep.lightboxState;
  var styles = state.bodyStyles || {};

  state.inertElements.forEach(function(item) {
    if (!item.inert) {
      item.element.removeAttribute('inert');
    }

    if (item.ariaHidden === null) {
      item.element.removeAttribute('aria-hidden');
    } else {
      item.element.setAttribute('aria-hidden', item.ariaHidden);
    }
  });

  state.inertElements = [];
  document.body.style.position = styles.position || '';
  document.body.style.top = styles.top || '';
  document.body.style.left = styles.left || '';
  document.body.style.right = styles.right || '';
  document.body.style.width = styles.width || '';
  document.body.style.overflow = styles.overflow || '';
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, state.scrollY);
  document.documentElement.style.scrollBehavior =
    styles.scrollBehavior || '';
};

RealStep.openLightbox = function(productId, origin) {
  var state = RealStep.lightboxState;
  var product = RealStep.findProduct(productId);
  var images = product ? RealStep.getProductImages(product) : [];
  var elements = RealStep.getLightboxElements();

  if (!elements.root || !images.length) {
    return;
  }

  if (state.closeTimer) {
    clearTimeout(state.closeTimer);
    state.closeTimer = null;
  }

  state.open = true;
  state.productId = productId;
  state.origin = origin;
  state.scrollY = window.scrollY;
  state.pointers = {};
  state.pointerStarts = {};
  elements.root.hidden = false;
  elements.root.setAttribute('aria-hidden', 'false');

  RealStep.resetLightboxTransform();
  RealStep.renderLightboxImage();
  RealStep.lockLightboxBackground();

  elements.root.offsetWidth;
  elements.root.classList.add('open');

  requestAnimationFrame(function() {
    elements.close.focus({
      preventScroll: true
    });
  });
};

RealStep.findLightboxOrigin = function(productId) {
  return Array.prototype.find.call(
    document.querySelectorAll('[data-lightbox-product]'),
    function(element) {
      return element.dataset.lightboxProduct === productId;
    }
  ) || null;
};

RealStep.closeLightbox = function() {
  var state = RealStep.lightboxState;
  var elements = RealStep.getLightboxElements();

  if (!state.open || !elements.root) {
    return;
  }

  state.open = false;
  elements.root.classList.remove('open');
  elements.root.setAttribute('aria-hidden', 'true');
  RealStep.unlockLightboxBackground();
  RealStep.resetLightboxTransform();

  var origin = state.origin && state.origin.isConnected
    ? state.origin
    : RealStep.findLightboxOrigin(state.productId);

  if (origin) {
    origin.focus({
      preventScroll: true
    });
  }

  state.closeTimer = setTimeout(function() {
    if (!state.open) {
      elements.root.hidden = true;
      state.productId = null;
    }
  }, 240);
};

RealStep.navigateLightbox = function(direction) {
  var state = RealStep.lightboxState;

  if (!state.open) {
    return;
  }

  var currentImage =
    RealStep.state.selectedImageByProduct[state.productId] || 0;

  RealStep.selectProductImage(
    state.productId,
    currentImage + direction
  );
  RealStep.resetLightboxTransform();
  RealStep.renderLightboxImage();
};

RealStep.toggleLightboxZoom = function() {
  RealStep.setLightboxZoom(
    RealStep.lightboxState.zoom > 1 ? 1 : 2.5
  );
};

RealStep.lightboxPointerDistance = function() {
  var pointers = RealStep.lightboxState.pointers;
  var ids = Object.keys(pointers);

  if (ids.length < 2) {
    return 0;
  }

  var first = pointers[ids[0]];
  var second = pointers[ids[1]];
  var deltaX = second.x - first.x;
  var deltaY = second.y - first.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
};

RealStep.handleLightboxPointerDown = function(event) {
  var state = RealStep.lightboxState;

  if (!event.target.matches('[data-lightbox-image]')) {
    return;
  }

  state.pointers[event.pointerId] = {
    x: event.clientX,
    y: event.clientY
  };
  state.pointerStarts[event.pointerId] = {
    x: event.clientX,
    y: event.clientY,
    time: Date.now()
  };

  if (Object.keys(state.pointers).length === 2) {
    state.pinchDistance = RealStep.lightboxPointerDistance();
    state.pinchZoom = state.zoom;
  }

  try {
    event.target.setPointerCapture(event.pointerId);
  } catch (error) {
    // El gesto sigue funcionando si el navegador no permite capturarlo.
  }

  event.target.classList.add('dragging');
  event.preventDefault();
};

RealStep.handleLightboxPointerMove = function(event) {
  var state = RealStep.lightboxState;
  var pointer = state.pointers[event.pointerId];

  if (!pointer) {
    return;
  }

  var previousX = pointer.x;
  var previousY = pointer.y;

  pointer.x = event.clientX;
  pointer.y = event.clientY;

  if (Object.keys(state.pointers).length >= 2) {
    var distance = RealStep.lightboxPointerDistance();

    if (state.pinchDistance) {
      RealStep.setLightboxZoom(
        state.pinchZoom * distance / state.pinchDistance
      );
    }
  } else if (state.zoom > 1) {
    state.panX += event.clientX - previousX;
    state.panY += event.clientY - previousY;
    RealStep.applyLightboxTransform();
  }

  event.preventDefault();
};

RealStep.handleLightboxPointerEnd = function(event) {
  var state = RealStep.lightboxState;
  var start = state.pointerStarts[event.pointerId];
  var pointer = state.pointers[event.pointerId];
  var wasTouchTap =
    event.pointerType === 'touch' &&
    start &&
    pointer &&
    Date.now() - start.time < 320 &&
    Math.abs(pointer.x - start.x) < 12 &&
    Math.abs(pointer.y - start.y) < 12;

  delete state.pointers[event.pointerId];
  delete state.pointerStarts[event.pointerId];

  if (Object.keys(state.pointers).length < 2) {
    state.pinchDistance = 0;
  }

  var elements = RealStep.getLightboxElements();

  if (elements.image) {
    elements.image.classList.remove('dragging');
  }

  if (wasTouchTap) {
    var now = Date.now();

    if (now - state.lastTapTime < 320) {
      RealStep.toggleLightboxZoom();
      state.lastTouchZoomAt = now;
      state.lastTapTime = 0;
    } else {
      state.lastTapTime = now;
    }
  }
};

RealStep.trapLightboxFocus = function(event) {
  var root = RealStep.getLightboxElements().root;
  var focusable = Array.prototype.filter.call(
    root.querySelectorAll('button:not([hidden]):not([disabled])'),
    function(element) {
      return element.offsetParent !== null;
    }
  );

  if (!focusable.length) {
    event.preventDefault();
    root.focus();
    return;
  }

  var first = focusable[0];
  var last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (
    !event.shiftKey &&
    document.activeElement === last
  ) {
    event.preventDefault();
    first.focus();
  }
};

RealStep.initLightbox = function() {
  var state = RealStep.lightboxState;

  if (state.initialized) {
    return;
  }

  state.initialized = true;

  document.body.insertAdjacentHTML('beforeend', `
    <div
      class="lightbox"
      id="product-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Vista ampliada del producto"
      aria-hidden="true"
      tabindex="-1"
      hidden
    >
      <div class="lightbox-stage" data-lightbox-backdrop>
        <button
          type="button"
          class="lightbox-close"
          data-lightbox-close
          aria-label="Cerrar imagen ampliada"
        >×</button>

        <button
          type="button"
          class="lightbox-nav lightbox-nav--previous"
          data-lightbox-nav="previous"
          aria-label="Ver imagen anterior"
        ><span aria-hidden="true">‹</span></button>

        <div class="lightbox-viewport">
          <img
            class="lightbox-image"
            data-lightbox-image
            alt=""
            draggable="false"
          >
        </div>

        <button
          type="button"
          class="lightbox-nav lightbox-nav--next"
          data-lightbox-nav="next"
          aria-label="Ver imagen siguiente"
        ><span aria-hidden="true">›</span></button>

        <div
          class="lightbox-counter"
          data-lightbox-counter
          aria-live="polite"
        ></div>
      </div>
    </div>
  `);

  var elements = RealStep.getLightboxElements();

  document.addEventListener('click', function(event) {
    var opener = event.target.closest('[data-lightbox-product]');

    if (opener) {
      RealStep.openLightbox(
        opener.dataset.lightboxProduct,
        opener
      );
      return;
    }

    if (!state.open) {
      return;
    }

    if (event.target.closest('[data-lightbox-close]')) {
      RealStep.closeLightbox();
      return;
    }

    var navigation = event.target.closest('[data-lightbox-nav]');

    if (navigation) {
      RealStep.navigateLightbox(
        navigation.dataset.lightboxNav === 'next' ? 1 : -1
      );
      return;
    }

    if (
      event.target.matches('[data-lightbox-backdrop]') ||
      event.target.matches('.lightbox-viewport')
    ) {
      RealStep.closeLightbox();
    }
  });

  document.addEventListener('keydown', function(event) {
    if (!state.open) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      RealStep.closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      RealStep.navigateLightbox(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      RealStep.navigateLightbox(1);
    } else if (event.key === 'Tab') {
      RealStep.trapLightboxFocus(event);
    }
  });

  elements.root.addEventListener('wheel', function(event) {
    if (!state.open) {
      return;
    }

    event.preventDefault();

    RealStep.setLightboxZoom(
      state.zoom * Math.exp(-event.deltaY * .0015)
    );
  }, { passive: false });

  elements.root.addEventListener('dblclick', function(event) {
    if (
      event.target.matches('[data-lightbox-image]') &&
      Date.now() - state.lastTouchZoomAt > 500
    ) {
      event.preventDefault();
      RealStep.toggleLightboxZoom();
    }
  });

  elements.root.addEventListener(
    'pointerdown',
    RealStep.handleLightboxPointerDown
  );
  elements.root.addEventListener(
    'pointermove',
    RealStep.handleLightboxPointerMove
  );
  elements.root.addEventListener(
    'pointerup',
    RealStep.handleLightboxPointerEnd
  );
  elements.root.addEventListener(
    'pointercancel',
    RealStep.handleLightboxPointerEnd
  );

  window.addEventListener('resize', function() {
    if (state.open) {
      RealStep.applyLightboxTransform();
    }
  });
};
