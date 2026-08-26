import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCatalogTargetIds,
  getProductTargetId,
  prioritizeCatalogTargetImages,
  resolveCatalogHash
} from '../../src/utils/navigation.js';

const categories = [
  {
    id: 'indumentaria',
    target: 'categoria-indumentaria',
    children: [{
      id: 'hombre',
      target: 'categoria-indumentaria-hombre'
    }]
  },
  {
    id: 'calzado',
    target: 'categoria-calzado',
    children: []
  }
];

const targets = getCatalogTargetIds(categories);

test('acceso sin hash se normaliza a inicio', () => {
  assert.equal(resolveCatalogHash('', targets), '#inicio');
});

test('hash válido se conserva literalmente', () => {
  assert.equal(resolveCatalogHash('#categoria-calzado', targets), '#categoria-calzado');
  assert.equal(
    resolveCatalogHash('#categoria-indumentaria-hombre', targets),
    '#categoria-indumentaria-hombre'
  );
  assert.equal(resolveCatalogHash('#contacto', targets), '#contacto');
});

test('productos se incorporan como destinos sin modificar sus IDs originales', () => {
  const productId = 'Vibe 2025 ';
  const target = getProductTargetId(productId);
  const productTargets = getCatalogTargetIds(categories, [{ id: productId }]);
  assert.equal(target, 'producto-Vibe_202025_20');
  assert.ok(productTargets.has(target));
  assert.equal(resolveCatalogHash(`#${target}`, productTargets), `#${target}`);
  assert.equal(productId, 'Vibe 2025 ');
});

test('hash inválido o corrupto vuelve a inicio', () => {
  assert.equal(resolveCatalogHash('#no-existe', targets), '#inicio');
  assert.equal(resolveCatalogHash('#%E0%A4%A', targets), '#inicio');
});

function createEditorialSection() {
  const cover = { loading: 'lazy', fetchPriority: 'auto' };
  const firstProduct = { loading: 'lazy', fetchPriority: 'auto' };
  const section = {
    querySelector(selector) {
      if (selector === '.category-editorial-cover-media img') return cover;
      if (selector === '.list .product:first-child .gallery-image--current') {
        return firstProduct;
      }
      return null;
    }
  };

  return { cover, firstProduct, section };
}

test('una categoría editorial prioriza sólo su portada y la primera ProductCard', () => {
  const { cover, firstProduct, section } = createEditorialSection();
  const documentTarget = { getElementById: () => section };

  assert.equal(
    prioritizeCatalogTargetImages('categoria-raquetas-tenis', documentTarget),
    2
  );
  assert.deepEqual(cover, { loading: 'eager', fetchPriority: 'high' });
  assert.deepEqual(firstProduct, { loading: 'eager', fetchPriority: 'high' });
});

test('Paletas conserva la misma prioridad selectiva del piloto', () => {
  const { cover, firstProduct, section } = createEditorialSection();
  const documentTarget = { getElementById: () => section };

  assert.equal(
    prioritizeCatalogTargetImages('categoria-paletas-padel', documentTarget),
    2
  );
  assert.equal(cover.loading, 'eager');
  assert.equal(firstProduct.fetchPriority, 'high');
});

test('un destino sin portada conserva sus imágenes lazy', () => {
  const firstProduct = { loading: 'lazy', fetchPriority: 'auto' };
  const documentTarget = {
    getElementById: () => ({
      querySelector(selector) {
        return selector.includes('category-editorial-cover') ? null : firstProduct;
      }
    })
  };

  assert.equal(
    prioritizeCatalogTargetImages('categoria-raquetas-squash', documentTarget),
    0
  );
  assert.deepEqual(firstProduct, { loading: 'lazy', fetchPriority: 'auto' });
});
