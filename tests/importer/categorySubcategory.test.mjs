import assert from 'node:assert/strict';
import test from 'node:test';
import { Diagnostics } from '../../scripts/catalog-import/diagnostics.mjs';
import { validateWorkbookData } from '../../scripts/catalog-import/validateWorkbook.mjs';
import { repoRoot } from './helpers.mjs';

function categoryRow(options) {
  const {
    row,
    categoria_id,
    product_category,
    product_subcategory = null
  } = options;

  return {
    _sheet: 'Categorias',
    _row: row,
    _cells: {},
    categoria_id,
    parent_id: null,
    label: categoria_id,
    target: 'target-' + categoria_id,
    habilitada: true,
    product_category,
    product_subcategory,
    genero: null,
    title: categoria_id,
    subtitle: '',
    data_source: null,
    orden: row
  };
}

function productRow(options) {
  const {
    row,
    producto_id,
    categoria,
    subcategoria = null
  } = options;

  return {
    _sheet: 'Productos',
    _row: row,
    _cells: {
      categoria: 'C' + row,
      subcategoria: 'D' + row
    },
    producto_id,
    nombre: producto_id,
    categoria,
    subcategoria,
    genero: null,
    sku: producto_id,
    precio: 100,
    habilitado: false,
    stock_mode: 'none',
    orden: row,
    pack_de: 1
  };
}

async function subcategoryErrors(categories, products) {
  const diagnostics = new Diagnostics();

  await validateWorkbookData(
    {
      Categorias: categories,
      Productos: products,
      Variantes: [],
      Imagenes: [],
      Stock: [],
      Caracteristicas: [],
      Listas: []
    },
    diagnostics,
    { repoRoot }
  );

  return diagnostics.items.filter(function(item) {
    return item.code === 'PRODUCT_SUBCATEGORY_INVALID';
  });
}

function configuredCategories() {
  return [
    categoryRow({
      row: 2,
      categoria_id: 'padre-a',
      product_category: 'categoria-a',
      product_subcategory: null
    }),
    categoryRow({
      row: 3,
      categoria_id: 'hija-a',
      product_category: 'categoria-a',
      product_subcategory: 'sub-a-1'
    }),
    categoryRow({
      row: 4,
      categoria_id: 'padre-b',
      product_category: 'categoria-b',
      product_subcategory: null
    }),
    categoryRow({
      row: 5,
      categoria_id: 'hija-b',
      product_category: 'categoria-b',
      product_subcategory: 'sub-b-1'
    })
  ];
}

test('producto con subcategoría válida no genera PRODUCT_SUBCATEGORY_INVALID', async () => {
  const errors = await subcategoryErrors(
    configuredCategories(),
    [
      productRow({
        row: 2,
        producto_id: 'producto-valido',
        categoria: 'categoria-a',
        subcategoria: 'sub-a-1'
      })
    ]
  );

  assert.equal(errors.length, 0);
});

test('producto con subcategoría vacía es válido aunque existan subcategorías configuradas', async () => {
  for (const subcategoria of [null, '', '   ']) {
    const errors = await subcategoryErrors(
      configuredCategories(),
      [
        productRow({
          row: 2,
          producto_id: 'producto-general',
          categoria: 'categoria-a',
          subcategoria
        })
      ]
    );

    assert.equal(errors.length, 0, 'subcategoria: ' + JSON.stringify(subcategoria));
  }
});

test('producto con subcategoría desconocida genera PRODUCT_SUBCATEGORY_INVALID', async () => {
  const errors = await subcategoryErrors(
    configuredCategories(),
    [
      productRow({
        row: 2,
        producto_id: 'producto-desconocido',
        categoria: 'categoria-a',
        subcategoria: 'sub-inexistente'
      })
    ]
  );

  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'PRODUCT_SUBCATEGORY_INVALID');
});

test('la autoridad es Categorias.product_subcategory por cada product_category', async () => {
  const categories = configuredCategories();

  const leaked = await subcategoryErrors(
    categories,
    [
      productRow({
        row: 2,
        producto_id: 'producto-cruzado',
        categoria: 'categoria-b',
        subcategoria: 'sub-a-1'
      })
    ]
  );
  assert.equal(leaked.length, 1);

  const ownValid = await subcategoryErrors(
    categories,
    [
      productRow({
        row: 2,
        producto_id: 'producto-propio',
        categoria: 'categoria-b',
        subcategoria: 'sub-b-1'
      })
    ]
  );
  assert.equal(ownValid.length, 0);
});

test('categoría sin subcategorías configuradas rechaza subcategoría informada', async () => {
  const categories = [
    categoryRow({
      row: 2,
      categoria_id: 'simple',
      product_category: 'categoria-simple',
      product_subcategory: null
    })
  ];

  const withSubcategory = await subcategoryErrors(
    categories,
    [
      productRow({
        row: 2,
        producto_id: 'producto-con-sub',
        categoria: 'categoria-simple',
        subcategoria: 'sub-no-configurada'
      })
    ]
  );
  assert.equal(withSubcategory.length, 1);

  const withoutSubcategory = await subcategoryErrors(
    categories,
    [
      productRow({
        row: 2,
        producto_id: 'producto-sin-sub',
        categoria: 'categoria-simple',
        subcategoria: null
      })
    ]
  );
  assert.equal(withoutSubcategory.length, 0);
});
