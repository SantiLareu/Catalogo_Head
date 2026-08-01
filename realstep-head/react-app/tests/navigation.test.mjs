import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getCatalogTargetIds,
  getProductTargetId,
  resolveCatalogHash
} from '../src/utils/navigation.js';

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
