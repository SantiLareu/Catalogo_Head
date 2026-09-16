import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  EXPORT_HEADERS,
  EXPORT_SCOPES,
  EXPORT_SHEET_NAME,
  buildExportFileName,
  buildExportRows,
  buildExportTable,
  filterExportProducts,
  getExportCategories,
  getExportSubcategories,
  isProductPublished,
  resolveCategoryLabel,
  resolveExportFilePrefix,
  resolveSubcategoryLabel,
  slugifyExportFragment
} from '../../src/services/catalogExport.js';

// Fixtures con la forma real de generated/catalog.json:
// talles en variant.sizes XOR product.sizes, variant.price opcional,
// subcategory null cuando no aplica, enabled como única marca de publicado.
const categories = [
  {
    id: 'calzado',
    label: 'CALZADO',
    order: 0,
    enabled: true,
    filter: { category: 'calzado', subcategory: null, gender: null },
    productCategory: 'calzado'
  },
  {
    id: 'indumentaria',
    label: 'INDUMENTARIA',
    order: 1,
    enabled: true,
    filter: { category: 'indumentaria', subcategory: null, gender: null },
    productCategory: 'indumentaria'
  },
  {
    id: 'accesorios',
    label: 'ACCESORIOS',
    order: 2,
    enabled: true,
    filter: { category: 'accesorios', subcategory: null, gender: null },
    productCategory: 'accesorios',
    children: [
      {
        id: 'accesorios-medias',
        label: 'MEDIAS',
        order: 0,
        enabled: true,
        filter: { category: 'accesorios', subcategory: 'medias', gender: null }
      },
      {
        id: 'accesorios-grips',
        label: 'GRIPS',
        order: 1,
        enabled: true,
        filter: { category: 'accesorios', subcategory: 'grips', gender: null }
      }
    ]
  },
  {
    id: 'snowboard',
    label: 'SNOWBOARD',
    order: 3,
    enabled: false,
    filter: { category: 'snowboard', subcategory: null, gender: null },
    productCategory: 'snowboard'
  }
];

const sizeEntry = (size, stock, order = 0) => ({ size, stock, order });

const catalog = {
  categories,
  products: [
    {
      id: 'ace-m1',
      category: 'calzado',
      subcategory: null,
      gender: null,
      name: 'ACE-M1 GREY / BLACK / RED',
      code: '06/1-0157',
      price: 52000,
      enabled: true,
      stockMode: 'size',
      order: 0,
      images: ['assets/products/calzado/ace-m1-1.webp'],
      sizes: [sizeEntry('7', 1, 0), sizeEntry('9', 0, 1)],
      specifications: null,
      variants: []
    },
    {
      id: 'paleta-gravity',
      category: 'accesorios',
      subcategory: 'grips',
      gender: null,
      name: 'Paleta Gravity Pro 2022 228162',
      code: '228162',
      price: 200050,
      enabled: true,
      stockMode: 'none',
      order: 1,
      images: [],
      sizes: [],
      specifications: null,
      variants: []
    },
    {
      id: 'motion-tshirt',
      category: 'indumentaria',
      subcategory: null,
      gender: 'hombre',
      name: 'MOTION T-SHIRT MEN',
      code: 'pendiente',
      price: 16150,
      enabled: true,
      stockMode: 'size',
      order: 2,
      images: [],
      sizes: [],
      specifications: null,
      variants: [
        {
          id: 'black',
          code: 'pendiente',
          colorName: 'Black',
          colorHex: '#111111',
          price: null,
          thumbnail: null,
          order: 0,
          images: ['assets/products/indumentaria-hombre/black.jpg'],
          sizes: [sizeEntry('S', 1, 0), sizeEntry('M', 0, 1)]
        },
        {
          id: 'grey',
          code: 'pendiente',
          colorName: 'Grey',
          colorHex: '#888888',
          price: null,
          thumbnail: null,
          order: 1,
          images: [],
          sizes: [sizeEntry('S', 1, 0)]
        }
      ]
    },
    {
      id: 'remera-oferta',
      category: 'indumentaria',
      subcategory: null,
      gender: 'dama',
      name: 'REMERA OFERTA',
      code: 'OF-1',
      price: 15000,
      enabled: true,
      stockMode: 'size',
      order: 3,
      images: [],
      sizes: [],
      specifications: null,
      variants: [
        {
          id: 'red',
          code: 'OF-1-R',
          colorName: 'Red',
          colorHex: '#cc0000',
          price: 9999,
          thumbnail: null,
          order: 0,
          images: [],
          sizes: [sizeEntry('M', 2, 0)]
        }
      ]
    },
    {
      id: 'cubregrip',
      category: 'accesorios',
      subcategory: 'cubre-grips',
      gender: null,
      name: 'CUBREGRIP PADEL PRO',
      code: 'CG-1',
      price: 8000,
      enabled: true,
      stockMode: 'none',
      order: 4,
      images: [],
      sizes: [],
      specifications: null,
      variants: [
        {
          id: 'black ',
          code: 'CG-1-B',
          colorName: 'Black',
          colorHex: null,
          price: null,
          thumbnail: null,
          order: 0,
          images: [],
          sizes: []
        }
      ]
    },
    {
      id: 'media-running',
      category: 'accesorios',
      subcategory: 'medias',
      gender: null,
      name: 'MEDIA RUNNING AÑO Ñ',
      code: 'M-1',
      price: 3500,
      enabled: true,
      stockMode: 'none',
      order: 5,
      images: [],
      sizes: [],
      specifications: null,
      variants: []
    },
    {
      id: 'duplicada',
      category: 'calzado',
      subcategory: null,
      gender: null,
      name: 'ZAPA DUPLICADA',
      code: 'Z-1',
      price: 10000,
      enabled: true,
      stockMode: 'size',
      order: 6,
      images: [],
      sizes: [sizeEntry('M', 1, 0), sizeEntry('M', 0, 1)],
      specifications: null,
      variants: []
    },
    {
      id: 'vieja',
      category: 'calzado',
      subcategory: null,
      gender: null,
      name: 'ZAPA VIEJA',
      code: 'Z-0',
      price: 5000,
      enabled: false,
      stockMode: 'size',
      order: 7,
      images: [],
      sizes: [sizeEntry('M', 1, 0)],
      specifications: null,
      variants: []
    },
    {
      id: 'tabla-nieve',
      category: 'snowboard',
      subcategory: null,
      gender: null,
      name: 'TABLA NIEVE',
      code: 'SN-1',
      price: 300000,
      enabled: true,
      stockMode: 'none',
      order: 8,
      images: [],
      sizes: [],
      specifications: null,
      variants: []
    }
  ]
};

const rowBy = (rows, articulo, color, talle) =>
  rows.find(
    (row) =>
      row.articulo === articulo && row.color === color && row.talle === talle
  );

test('la hoja se llama Productos y los encabezados tienen el orden exacto', () => {
  assert.equal(EXPORT_SHEET_NAME, 'Productos');
  assert.deepEqual(EXPORT_HEADERS, [
    'Artículo',
    'Color',
    'Talle',
    'Categoría',
    'Subcategoría',
    'Precio'
  ]);
  const table = buildExportTable(catalog, { scope: EXPORT_SCOPES.ALL });
  assert.equal(table.sheetName, 'Productos');
  assert.deepEqual(table.headers, EXPORT_HEADERS);
});

test('una fila por combinación artículo/color/talle (variantes con talles)', () => {
  const rows = buildExportRows(
    catalog.products.filter((product) => product.id === 'motion-tshirt'),
    categories
  );
  assert.equal(rows.length, 3);
  assert.ok(rowBy(rows, 'MOTION T-SHIRT MEN', 'Black', 'S'));
  assert.ok(rowBy(rows, 'MOTION T-SHIRT MEN', 'Black', 'M'));
  assert.ok(rowBy(rows, 'MOTION T-SHIRT MEN', 'Grey', 'S'));
});

test('producto sin variantes reparte sus talles con color vacío', () => {
  const rows = buildExportRows(
    catalog.products.filter((product) => product.id === 'ace-m1'),
    categories
  );
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => [row.color, row.talle]),
    [
      ['', '7'],
      ['', '9']
    ]
  );
});

test('producto sin talle genera una fila con color y talle vacíos', () => {
  const rows = buildExportRows(
    catalog.products.filter((product) => product.id === 'paleta-gravity'),
    categories
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].color, '');
  assert.equal(rows[0].talle, '');
  assert.equal(rows[0].articulo, 'Paleta Gravity Pro 2022 228162');
});

test('variante sin talles genera una fila con talle vacío', () => {
  const rows = buildExportRows(
    catalog.products.filter((product) => product.id === 'cubregrip'),
    categories
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].color, 'Black');
  assert.equal(rows[0].talle, '');
});

test('las celdas vacías quedan vacías, sin valores artificiales', () => {
  const rows = buildExportRows(catalog.products, categories);
  const banned = ['-', 'N/A', 'Sin talle', 'Sin color'];
  rows.forEach((row) => {
    [row.color, row.talle, row.subcategoria].forEach((cell) => {
      assert.ok(!banned.includes(cell), `celda artificial: ${cell}`);
    });
  });
  assert.ok(rows.some((row) => row.color === ''));
  assert.ok(rows.some((row) => row.talle === ''));
  assert.ok(rows.some((row) => row.subcategoria === ''));
});

test('las combinaciones con stock 0 se exportan igual (el stock no filtra)', () => {
  const rows = buildExportRows(catalog.products, categories);
  assert.ok(rowBy(rows, 'ACE-M1 GREY / BLACK / RED', '', '9'));
  assert.ok(rowBy(rows, 'MOTION T-SHIRT MEN', 'Black', 'M'));
});

test('el precio es numérico: usa el de la variante o el del producto', () => {
  const rows = buildExportRows(catalog.products, categories);
  rows.forEach((row) => {
    assert.equal(typeof row.precio, 'number');
    assert.ok(Number.isFinite(row.precio));
  });
  assert.equal(rowBy(rows, 'MOTION T-SHIRT MEN', 'Black', 'S').precio, 16150);
  assert.equal(rowBy(rows, 'REMERA OFERTA', 'Red', 'M').precio, 9999);
  assert.equal(
    rowBy(rows, 'ACE-M1 GREY / BLACK / RED', '', '7').precio,
    52000
  );
});

test('exportación completa: solo productos publicados, sin categoría deshabilitada', () => {
  const products = filterExportProducts(catalog, { scope: EXPORT_SCOPES.ALL });
  assert.ok(!products.some((product) => product.id === 'vieja'));
  assert.ok(!products.some((product) => product.id === 'tabla-nieve'));
  assert.equal(products.length, 7);
  const table = buildExportTable(catalog, { scope: EXPORT_SCOPES.ALL });
  assert.ok(table.rows.length > 0);
  assert.ok(
    !table.rows.some((row) => row[0] === 'ZAPA VIEJA' || row[0] === 'TABLA NIEVE')
  );
});

test('filtro por categoría: solo productos de esa categoría', () => {
  const table = buildExportTable(catalog, {
    scope: EXPORT_SCOPES.CATEGORY,
    category: 'indumentaria'
  });
  assert.ok(table.rows.length > 0);
  table.rows.forEach((row) => {
    assert.equal(row[3], 'INDUMENTARIA');
  });
  assert.ok(table.rows.some((row) => row[0] === 'MOTION T-SHIRT MEN'));
  assert.ok(table.rows.some((row) => row[0] === 'REMERA OFERTA'));
  assert.ok(!table.rows.some((row) => row[0].startsWith('ACE-M1')));
});

test('filtro por subcategoría: categoría + subcategoría', () => {
  const table = buildExportTable(catalog, {
    scope: EXPORT_SCOPES.SUBCATEGORY,
    category: 'accesorios',
    subcategory: 'medias'
  });
  assert.equal(table.rows.length, 1);
  assert.deepEqual(table.rows[0].slice(0, 5), [
    'MEDIA RUNNING AÑO Ñ',
    '',
    '',
    'ACCESORIOS',
    'MEDIAS'
  ]);
});

test('la estructura del Excel es idéntica en los tres alcances', () => {
  const selections = [
    { scope: EXPORT_SCOPES.ALL },
    { scope: EXPORT_SCOPES.CATEGORY, category: 'calzado' },
    {
      scope: EXPORT_SCOPES.SUBCATEGORY,
      category: 'accesorios',
      subcategory: 'grips'
    }
  ];
  selections.forEach((selection) => {
    const table = buildExportTable(catalog, selection);
    assert.deepEqual(table.headers, EXPORT_HEADERS);
    table.rows.forEach((row) => {
      assert.equal(row.length, 6);
      assert.equal(typeof row[5], 'number');
    });
  });
});

test('categorías y subcategorías se derivan de los datos, sin hardcodear', () => {
  const options = getExportCategories(catalog);
  assert.deepEqual(
    options.map((option) => option.value),
    ['calzado', 'indumentaria', 'accesorios']
  );
  assert.deepEqual(
    options.map((option) => option.label),
    ['CALZADO', 'INDUMENTARIA', 'ACCESORIOS']
  );

  const renamed = {
    categories: categories.map((category) =>
      category.id === 'calzado'
        ? { ...category, label: 'CALZADO NUEVO' }
        : category
    ),
    products: catalog.products
  };
  assert.equal(
    getExportCategories(renamed).find((option) => option.value === 'calzado')
      .label,
    'CALZADO NUEVO'
  );

  const added = {
    categories: [
      ...categories,
      {
        id: 'nueva',
        label: 'NUEVA',
        order: 4,
        enabled: true,
        filter: { category: 'nueva', subcategory: null, gender: null },
        productCategory: 'nueva'
      }
    ],
    products: [
      ...catalog.products,
      {
        id: 'nuevo',
        category: 'nueva',
        subcategory: null,
        gender: null,
        name: 'PRODUCTO NUEVO',
        code: 'N-1',
        price: 1000,
        enabled: true,
        stockMode: 'none',
        order: 9,
        images: [],
        sizes: [],
        specifications: null,
        variants: []
      }
    ]
  };
  assert.ok(
    getExportCategories(added).some((option) => option.value === 'nueva')
  );
});

test('el segundo selector muestra solo subcategorías de la categoría elegida', () => {
  // Fixture controlado y sintético: verifica la regla
  // "categoría seleccionada → solamente sus subcategorías" sin depender del
  // contenido puntual del fixture compartido ni de generated/catalog.json.
  // Agregar mañana una subcategoría válida al catálogo no debe romperlo.
  const scopedProduct = (id, category, subcategory, enabled = true) => ({
    id,
    category,
    subcategory,
    gender: null,
    name: `Nombre ${id}`,
    code: null,
    price: 1000,
    enabled,
    stockMode: 'none',
    order: 0,
    images: [],
    sizes: [],
    specifications: null,
    variants: []
  });
  const scopedCatalog = {
    categories: [
      {
        id: 'ropa',
        label: 'ROPA',
        order: 0,
        enabled: true,
        filter: { category: 'ropa', subcategory: null, gender: null },
        productCategory: 'ropa',
        children: [
          {
            id: 'ropa-pantalones',
            label: 'PANTALONES',
            order: 0,
            enabled: true,
            filter: { category: 'ropa', subcategory: 'pantalones', gender: null }
          },
          {
            id: 'ropa-remeras',
            label: 'REMERAS',
            order: 1,
            enabled: true,
            filter: { category: 'ropa', subcategory: 'remeras', gender: null }
          }
        ]
      },
      {
        id: 'deporte',
        label: 'DEPORTE',
        order: 1,
        enabled: true,
        filter: { category: 'deporte', subcategory: null, gender: null },
        productCategory: 'deporte',
        children: [
          {
            id: 'deporte-remeras',
            label: 'REMERAS DEPORTE',
            order: 0,
            enabled: true,
            filter: { category: 'deporte', subcategory: 'remeras', gender: null }
          }
        ]
      },
      {
        id: 'libros',
        label: 'LIBROS',
        order: 2,
        enabled: true,
        filter: { category: 'libros', subcategory: null, gender: null },
        productCategory: 'libros'
      }
    ],
    products: [
      scopedProduct('r1', 'ropa', 'remeras'),
      scopedProduct('r2', 'ropa', 'pantalones'),
      scopedProduct('r3', 'ropa', 'remeras', false),
      scopedProduct('r4', 'ropa', 'buzos'),
      scopedProduct('d1', 'deporte', 'remeras'),
      scopedProduct('l1', 'libros', null)
    ]
  };

  // Solo subcategorías de ropa, ordenadas por orden del hijo; el producto
  // deshabilitado no agrega nada y la subcategoría sin hijo usa el valor
  // crudo como etiqueta.
  const ropa = getExportSubcategories(scopedCatalog, 'ropa');
  assert.deepEqual(
    ropa.map((option) => option.value),
    ['buzos', 'pantalones', 'remeras']
  );
  assert.deepEqual(
    ropa.map((option) => option.label),
    ['buzos', 'PANTALONES', 'REMERAS']
  );

  // El mismo valor de subcategoría en otra categoría no se mezcla: cada
  // selector resuelve dentro de su propio padre.
  assert.deepEqual(getExportSubcategories(scopedCatalog, 'deporte'), [
    { value: 'remeras', label: 'REMERAS DEPORTE', order: 0 }
  ]);

  // Categoría sin subcategorías, categoría inexistente y selección nula.
  assert.deepEqual(getExportSubcategories(scopedCatalog, 'libros'), []);
  assert.deepEqual(getExportSubcategories(scopedCatalog, 'inexistente'), []);
  assert.deepEqual(getExportSubcategories(scopedCatalog, null), []);
});

test('etiquetas con fallback al valor crudo ante datos sin categoría', () => {
  assert.equal(resolveCategoryLabel(categories, 'calzado'), 'CALZADO');
  assert.equal(resolveCategoryLabel(categories, 'otra'), 'otra');
  assert.equal(resolveCategoryLabel([], 'otra'), 'otra');
  assert.equal(resolveCategoryLabel(categories, null), '');
  assert.equal(
    resolveSubcategoryLabel(categories, 'accesorios', 'medias'),
    'MEDIAS'
  );
  assert.equal(
    resolveSubcategoryLabel(categories, 'accesorios', 'inexistente'),
    'inexistente'
  );
  assert.equal(
    resolveSubcategoryLabel(categories, 'calzado', null),
    ''
  );
});

test('isProductPublished refleja la visibilidad del catálogo', () => {
  const byId = Object.fromEntries(
    catalog.products.map((product) => [product.id, product])
  );
  assert.equal(isProductPublished(byId['ace-m1'], categories), true);
  assert.equal(isProductPublished(byId['vieja'], categories), false);
  assert.equal(isProductPublished(byId['tabla-nieve'], categories), false);
  assert.equal(isProductPublished(byId['ace-m1'], []), true);
});

test('filas deduplicadas y valores literales preservados', () => {
  const rows = buildExportRows(
    catalog.products.filter((product) => product.id === 'duplicada'),
    categories
  );
  assert.equal(rows.length, 1);

  const cubregrip = buildExportRows(
    catalog.products.filter((product) => product.id === 'cubregrip'),
    categories
  );
  assert.equal(cubregrip[0].color, 'Black');

  const rowsAll = buildExportRows(catalog.products, categories);
  assert.ok(
    rowsAll.some((row) => row.articulo === 'MEDIA RUNNING AÑO Ñ')
  );
});

test('sin resultados se genera tabla solo con encabezados', () => {
  const table = buildExportTable(catalog, {
    scope: EXPORT_SCOPES.SUBCATEGORY,
    category: 'accesorios',
    subcategory: 'inexistente'
  });
  assert.deepEqual(table.headers, EXPORT_HEADERS);
  assert.deepEqual(table.rows, []);
});

test('las filas solo contienen las seis columnas, sin campos prohibidos', () => {
  const rows = buildExportRows(catalog.products, categories);
  const bannedFragments = [
    'sku',
    'ean',
    'stock',
    'image',
    'id',
    'hash',
    'version',
    'pack',
    'code',
    'order',
    'thumb'
  ];
  rows.forEach((row) => {
    assert.deepEqual(Object.keys(row), [
      'articulo',
      'color',
      'talle',
      'categoria',
      'subcategoria',
      'precio'
    ]);
    const serialized = JSON.stringify(row).toLowerCase();
    bannedFragments.forEach((fragment) => {
      assert.ok(
        !serialized.includes(`"${fragment}`),
        `campo prohibido ${fragment} en ${serialized}`
      );
    });
  });

  const table = buildExportTable(catalog, { scope: EXPORT_SCOPES.ALL });
  table.rows.forEach((row) => {
    assert.equal(row.length, 6);
    row.forEach((cell) => {
      assert.ok(cell !== null && cell !== undefined);
    });
  });
});

test('nombres de archivo descriptivos, seguros y con fecha', () => {
  const now = new Date(2026, 8, 16);
  assert.equal(
    buildExportFileName(
      { scope: EXPORT_SCOPES.ALL },
      { prefix: 'catalogo-head', now }
    ),
    'catalogo-head-completo-2026-09-16.xlsx'
  );
  assert.equal(
    buildExportFileName(
      { scope: EXPORT_SCOPES.CATEGORY, category: 'indumentaria' },
      { prefix: 'catalogo-head', now }
    ),
    'catalogo-head-indumentaria-2026-09-16.xlsx'
  );
  assert.equal(
    buildExportFileName(
      {
        scope: EXPORT_SCOPES.SUBCATEGORY,
        category: 'accesorios',
        subcategory: 'cubre-grips'
      },
      { prefix: 'catalogo-head', now }
    ),
    'catalogo-head-cubre-grips-2026-09-16.xlsx'
  );
  assert.equal(
    buildExportFileName(
      {
        scope: EXPORT_SCOPES.SUBCATEGORY,
        category: 'accesorios',
        subcategory: 'Medias  Niños/Ñandú!'
      },
      { prefix: 'catalogo-head', now }
    ),
    'catalogo-head-medias-ninos-nandu-2026-09-16.xlsx'
  );
});

test('slug y prefijo de archivo son seguros', () => {
  assert.equal(slugifyExportFragment('Cubre Grips'), 'cubre-grips');
  assert.equal(slugifyExportFragment('MUÑEQUERAS  2026'), 'munequeras-2026');
  assert.equal(slugifyExportFragment('  '), '');
  assert.equal(slugifyExportFragment(null), '');
  assert.equal(resolveExportFilePrefix('HEAD Mayorista'), 'catalogo-head');
  assert.equal(resolveExportFilePrefix(''), 'catalogo');
  assert.equal(resolveExportFilePrefix(null), 'catalogo');
});

test('el catálogo real genera una tabla válida sin asumir su contenido', async () => {
  const source = await readFile(
    new URL('../../generated/catalog.json', import.meta.url),
    'utf8'
  );
  const real = JSON.parse(source);
  const table = buildExportTable(real, { scope: EXPORT_SCOPES.ALL });

  assert.equal(table.sheetName, 'Productos');
  assert.deepEqual(table.headers, EXPORT_HEADERS);
  assert.ok(table.rows.length > 0);

  table.rows.forEach((row) => {
    assert.equal(row.length, 6);
    assert.equal(typeof row[0], 'string');
    assert.ok(row[0].trim() !== '');
    assert.equal(typeof row[1], 'string');
    assert.equal(typeof row[2], 'string');
    assert.equal(typeof row[3], 'string');
    assert.equal(typeof row[5], 'number');
    assert.ok(Number.isFinite(row[5]));
  });

  const optionValues = new Set(
    getExportCategories(real).map((option) => option.value)
  );
  assert.ok(optionValues.size > 0);
  real.products
    .filter((product) => product.enabled !== false)
    .forEach((product) => {
      assert.ok(
        optionValues.has(product.category),
        `categoría sin opción: ${product.category}`
      );
    });
});

test('la lógica de exportación no hardcodea categorías del catálogo', async () => {
  const source = await readFile(
    new URL('../../src/services/catalogExport.js', import.meta.url),
    'utf8'
  );
  ['indumentaria', 'calzado', 'accesorios', 'remeras', 'medias'].forEach(
    (word) => {
      assert.doesNotMatch(
        source,
        new RegExp(`['"]${word}['"]`),
        `categoría hardcodeada: ${word}`
      );
    }
  );
});

test('la UI integra botón, modal, writer diferido y estilos', async () => {
  const header = await readFile(
    new URL('../../src/components/layout/Header.jsx', import.meta.url),
    'utf8'
  );
  assert.match(header, /Exportar a Excel/);
  assert.match(header, /ExportCatalogModal/);
  assert.match(header, /aria-haspopup="dialog"/);

  const modal = await readFile(
    new URL(
      '../../src/components/export/ExportCatalogModal.jsx',
      import.meta.url
    ),
    'utf8'
  );
  assert.match(modal, /Catálogo completo/);
  assert.match(modal, /Subcategoría/);
  assert.match(modal, /Cancelar/);
  assert.match(modal, /Descargar Excel/);
  assert.match(modal, /buildExportTable/);
  assert.match(modal, /downloadCatalogExport/);
  assert.doesNotMatch(modal, /from 'xlsx'|from "xlsx"/);

  const writer = await readFile(
    new URL('../../src/services/exportWorkbook.js', import.meta.url),
    'utf8'
  );
  assert.match(writer, /await import\('xlsx'\)/);
  assert.match(writer, /book_append_sheet/);
  assert.match(writer, /sheetName/);

  const main = await readFile(
    new URL('../../src/main.jsx', import.meta.url),
    'utf8'
  );
  assert.match(main, /styles\/export\.css/);

  const packageJson = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8')
  );
  assert.ok(packageJson.dependencies.xlsx);
});

test('las filas se ordenan por categoría, subcategoría, artículo, color y talle', () => {
  // Fixture controlado con entrada deliberadamente desordenada: verifica la
  // jerarquía de orden sin depender del contenido del catálogo real.
  const orderedCatalog = {
    categories: [
      {
        id: 'b',
        label: 'BETA',
        order: 1,
        enabled: true,
        filter: { category: 'b', subcategory: null, gender: null },
        productCategory: 'b',
        children: [
          {
            id: 'b-dos',
            label: 'B DOS',
            order: 1,
            enabled: true,
            filter: { category: 'b', subcategory: 'b-dos', gender: null }
          },
          {
            id: 'b-uno',
            label: 'B UNO',
            order: 0,
            enabled: true,
            filter: { category: 'b', subcategory: 'b-uno', gender: null }
          }
        ]
      },
      {
        id: 'a',
        label: 'ALFA',
        order: 0,
        enabled: true,
        filter: { category: 'a', subcategory: null, gender: null },
        productCategory: 'a'
      }
    ],
    products: [
      {
        id: 'zeta',
        category: 'b',
        subcategory: 'b-dos',
        gender: null,
        name: 'Zeta',
        code: 'Z-1',
        price: 10,
        enabled: true,
        stockMode: 'size',
        order: 0,
        images: [],
        sizes: [],
        specifications: null,
        variants: [
          {
            id: 'blanco',
            code: 'Z-1-B',
            colorName: 'Blanco',
            colorHex: null,
            price: null,
            thumbnail: null,
            order: 1,
            images: [],
            sizes: [
              { size: 'M', stock: 0, order: 1 },
              { size: 'S', stock: 1, order: 0 }
            ]
          },
          {
            id: 'negro',
            code: 'Z-1-N',
            colorName: 'Negro',
            colorHex: null,
            price: null,
            thumbnail: null,
            order: 0,
            images: [],
            sizes: [{ size: 'S', stock: 1, order: 0 }]
          }
        ]
      },
      {
        id: 'general',
        category: 'b',
        subcategory: null,
        gender: null,
        name: 'A General',
        code: 'G-1',
        price: 5,
        enabled: true,
        stockMode: 'none',
        order: 1,
        images: [],
        sizes: [],
        specifications: null,
        variants: []
      },
      {
        id: 'alfab',
        category: 'b',
        subcategory: 'b-uno',
        gender: null,
        name: 'Alfa B',
        code: 'AB-1',
        price: 20,
        enabled: true,
        stockMode: 'size',
        order: 2,
        images: [],
        sizes: [
          { size: '10', stock: 1, order: 1 },
          { size: '9', stock: 1, order: 0 }
        ],
        specifications: null,
        variants: []
      },
      {
        id: 'alfaa',
        category: 'a',
        subcategory: null,
        gender: null,
        name: 'Alfa A',
        code: 'AA-1',
        price: 30,
        enabled: true,
        stockMode: 'none',
        order: 3,
        images: [],
        sizes: [],
        specifications: null,
        variants: []
      }
    ]
  };

  const expected = [
    ['Alfa A', '', '', 'ALFA', '', 30],
    ['A General', '', '', 'BETA', '', 5],
    ['Alfa B', '', '9', 'BETA', 'B UNO', 20],
    ['Alfa B', '', '10', 'BETA', 'B UNO', 20],
    ['Zeta', 'Blanco', 'S', 'BETA', 'B DOS', 10],
    ['Zeta', 'Blanco', 'M', 'BETA', 'B DOS', 10],
    ['Zeta', 'Negro', 'S', 'BETA', 'B DOS', 10]
  ];

  // Incluye stock 0 (Blanco/M) y ordena talles por `order` real: '9' antes
  // que '10', S antes que M aunque el arreglo de entrada venga invertido.
  const complete = buildExportTable(orderedCatalog, { scope: EXPORT_SCOPES.ALL });
  assert.deepEqual(complete.rows, expected);

  // El mismo orden vale para la exportación por categoría.
  const byCategory = buildExportTable(orderedCatalog, {
    scope: EXPORT_SCOPES.CATEGORY,
    category: 'b'
  });
  assert.deepEqual(byCategory.rows, expected.slice(1));
});
