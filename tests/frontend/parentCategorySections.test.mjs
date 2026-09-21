import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildCatalogSections,
  getEnabledChildren,
  getGeneralProductsForParent,
  getProductsForCategory,
  getRenderableCategories,
  parentHasOwnSection
} from '../../src/data/catalogSelectors.js';
import { getCatalogTargetIds } from '../../src/utils/navigation.js';

function leafCategories() {
  return [
    {
      id: 'simple',
      label: 'SIMPLE',
      title: 'Simple',
      target: 'categoria-simple',
      enabled: true,
      order: 0,
      filter: { category: 'categoria-simple', subcategory: null, gender: null }
    }
  ];
}

function parentCategories() {
  return [
    {
      id: 'padre',
      label: 'PADRE',
      title: 'Padre',
      target: 'categoria-padre',
      enabled: true,
      order: 0,
      filter: { category: 'categoria-padre', subcategory: null, gender: null },
      children: [
        {
          id: 'hija',
          label: 'HIJA',
          title: 'Hija',
          target: 'categoria-hija',
          enabled: true,
          order: 0,
          filter: {
            category: 'categoria-padre',
            subcategory: 'sub-hija',
            gender: null
          }
        }
      ]
    }
  ];
}

function product(options) {
  return {
    id: 'producto',
    name: 'Producto',
    category: 'categoria-padre',
    subcategory: null,
    gender: null,
    enabled: true,
    order: 0,
    price: 100,
    images: [],
    sizes: [],
    variants: [],
    ...options
  };
}

function sectionIds(sections) {
  return sections.map(function(section) {
    return section.category.id;
  });
}

function allSectionProductIds(sections) {
  return sections.flatMap(function(section) {
    return section.products.map(function(item) {
      return item.id;
    });
  });
}

test('padre sin hijos renderiza su propia sección', () => {
  const categories = leafCategories();
  const products = [product({ id: 'uno', category: 'categoria-simple' })];

  assert.deepEqual(sectionIds(buildCatalogSections(categories, products)), [
    'simple'
  ]);
  assert.deepEqual(
    buildCatalogSections(categories, products)[0].products.map(({ id }) => id),
    ['uno']
  );
});

test('padre con hijos y sin productos generales conserva el comportamiento actual', () => {
  const categories = parentCategories();
  const products = [
    product({ id: 'hija-1', subcategory: 'sub-hija', order: 0 }),
    product({ id: 'hija-2', subcategory: 'sub-hija', order: 1 })
  ];

  assert.equal(parentHasOwnSection(products, categories[0]), false);
  assert.deepEqual(getGeneralProductsForParent(products, categories[0]), []);
  assert.deepEqual(sectionIds(buildCatalogSections(categories, products)), [
    'hija'
  ]);
  assert.deepEqual(getRenderableCategories(categories), getEnabledChildren(categories[0]));
  assert.deepEqual(
    getRenderableCategories(categories, products).map(({ id }) => id),
    ['hija']
  );
});

test('padre con hijos y productos generales renderiza padre más hija sin duplicados', () => {
  const categories = parentCategories();
  const products = [
    product({ id: 'general-1', subcategory: null, order: 0 }),
    product({ id: 'general-2', subcategory: '', order: 1 }),
    product({ id: 'hija-1', subcategory: 'sub-hija', order: 2 })
  ];

  assert.equal(parentHasOwnSection(products, categories[0]), true);

  const sections = buildCatalogSections(categories, products);
  assert.deepEqual(sectionIds(sections), ['padre', 'hija']);

  const parentSection = sections.find(({ category }) => category.id === 'padre');
  const childSection = sections.find(({ category }) => category.id === 'hija');

  assert.deepEqual(
    parentSection.products.map(({ id }) => id),
    ['general-1', 'general-2']
  );
  assert.deepEqual(
    childSection.products.map(({ id }) => id),
    ['hija-1']
  );

  const allIds = allSectionProductIds(sections);
  assert.equal(new Set(allIds).size, allIds.length);
  assert.equal(allIds.length, products.length);
});

test('producto con subcategoría válida pertenece a la hija y no al padre', () => {
  const categories = parentCategories();
  const childProduct = product({ id: 'valido', subcategory: 'sub-hija' });

  assert.deepEqual(
    getProductsForCategory([childProduct], categories[0].children[0]).map(
      ({ id }) => id
    ),
    ['valido']
  );
  assert.deepEqual(
    getGeneralProductsForParent([childProduct], categories[0]).map(
      ({ id }) => id
    ),
    []
  );
});

test('producto con subcategoría vacía pertenece al padre y no a la hija', () => {
  const categories = parentCategories();

  for (const subcategory of [null, '']) {
    const generalProduct = product({ id: 'general', subcategory });

    assert.deepEqual(
      getGeneralProductsForParent([generalProduct], categories[0]).map(
        ({ id }) => id
      ),
      ['general']
    );
    assert.deepEqual(
      getProductsForCategory([generalProduct], categories[0].children[0]),
      []
    );
  }
});

test('producto con subcategoría desconocida no pertenece a la hija', () => {
  const categories = parentCategories();
  const unknownProduct = product({
    id: 'desconocido',
    subcategory: 'sub-inexistente'
  });

  assert.deepEqual(
    getProductsForCategory([unknownProduct], categories[0].children[0]),
    []
  );
});

test('ningún producto aparece duplicado entre padre e hija', () => {
  const categories = parentCategories();
  const products = [
    product({ id: 'general-1', subcategory: null, order: 0 }),
    product({ id: 'hija-1', subcategory: 'sub-hija', order: 1 }),
    product({ id: 'hija-2', subcategory: 'sub-hija', order: 2 })
  ];

  const sections = buildCatalogSections(categories, products);
  const allIds = allSectionProductIds(sections);

  assert.deepEqual([...allIds].sort(), ['general-1', 'hija-1', 'hija-2']);
  assert.equal(new Set(allIds).size, allIds.length);
});

test('navegación y target del padre existen cuando tiene sección propia', async () => {
  const categories = parentCategories();
  const products = [
    product({ id: 'general-1', subcategory: null, order: 0 }),
    product({ id: 'hija-1', subcategory: 'sub-hija', order: 1 })
  ];

  const sections = buildCatalogSections(categories, products);
  const parentSection = sections.find(({ category }) => category.id === 'padre');

  assert.ok(parentSection);
  assert.equal(parentSection.category.target, 'categoria-padre');
  assert.equal(parentSection.category.label, 'PADRE');
  assert.ok(getCatalogTargetIds(categories, products).has('categoria-padre'));
  assert.ok(getCatalogTargetIds(categories, products).has('categoria-hija'));

  const [selectors, categoryIndex, categoryGroup] = await Promise.all([
    readFile(
      new URL('../../src/data/catalogSelectors.js', import.meta.url),
      'utf8'
    ),
    readFile(
      new URL(
        '../../src/components/categories/CategoryIndex.jsx',
        import.meta.url
      ),
      'utf8'
    ),
    readFile(
      new URL(
        '../../src/components/categories/CategoryGroup.jsx',
        import.meta.url
      ),
      'utf8'
    )
  ]);

  assert.match(categoryIndex, /parentHasOwnSection/);
  assert.match(categoryIndex, /showParentLink/);
  assert.match(categoryIndex, /category\.target === target/);
  assert.match(categoryGroup, /showParentLink/);
  assert.match(categoryGroup, /category=\{category\}/);
  assert.doesNotMatch(categoryIndex, />General</);
  assert.doesNotMatch(categoryGroup, />General</);
  assert.doesNotMatch(categoryIndex, /['"]General['"]/);
  assert.doesNotMatch(categoryGroup, /['"]General['"]/);
  assert.doesNotMatch(categoryIndex, /Ver todo/);
  assert.doesNotMatch(categoryGroup, /Ver todo/);

  for (const source of [selectors, categoryIndex, categoryGroup]) {
    assert.doesNotMatch(source, /paletas-padel/);
    assert.doesNotMatch(source, /preventa-2026/);
  }
});
