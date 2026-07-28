import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {
  categoryFilterForLegacyEntry,
  flattenLegacyCategories,
  loadLegacyCatalog
} from './catalog-import/loadLegacyCatalog.mjs';
import {
  setListValidation,
  styleWorksheet
} from './catalog-import/workbookStyle.mjs';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');
const outputPath = path.join(repoRoot, 'catalog', 'products.xlsx');
const force = process.argv.includes('--force');

if (!force) {
  try {
    await fs.access(outputPath);
    console.error(
      'El Excel ya existe. Para proteger la fuente manual, el script ' +
      'no lo sobrescribirá. Use --force únicamente para reconstruir ' +
      'el bootstrap desde los JavaScript legacy.'
    );
    process.exitCode = 1;
    process.exit();
  } catch (error) {
    // El archivo todavía no existe: se puede crear el bootstrap inicial.
  }
}

const legacy = await loadLegacyCatalog(repoRoot);
const workbook = new ExcelJS.Workbook();

workbook.creator = 'Real Step';
workbook.lastModifiedBy = 'Real Step';
workbook.created = new Date('2026-01-01T00:00:00.000Z');
workbook.modified = new Date('2026-01-01T00:00:00.000Z');
workbook.calcProperties.fullCalcOnLoad = false;

const categoryRows = flattenLegacyCategories(legacy.categories)
  .map(function(entry) {
    const category = entry.category;
    const filter = categoryFilterForLegacyEntry(entry);

    return {
      categoria_id: category.id,
      parent_id: entry.parentId || '',
      label: category.label,
      target: category.target,
      habilitada: category.enabled,
      product_category: filter.productCategory,
      product_subcategory: filter.productSubcategory,
      genero: filter.gender,
      title: category.title,
      subtitle: category.subtitle || '',
      data_source: category.dataSource || '',
      orden: entry.order
    };
  });

const productRows = [];
const variantRows = [];
const imageRows = [];
const stockRows = [];
const specificationRows = [];
const technicalLabels = {
  fit: 'FIT',
  mainFabric: 'MAIN FABRIC',
  secondFabric: '2ND FABRIC',
  secondaryFabric: 'SECONDARY FABRIC',
  thirdFabric: 'THIRD FABRIC',
  features: 'FEATURES'
};

legacy.products.forEach(function(product, productOrder) {
  const variants = Array.isArray(product.variants)
    ? product.variants
    : [];
  const productSizes = Array.isArray(product.sizes)
    ? product.sizes
    : [];
  const hasVariantSizes = variants.some(function(variant) {
    return Array.isArray(variant.sizes) && variant.sizes.length > 0;
  });

  productRows.push({
    producto_id: product.id,
    nombre: product.name,
    categoria: product.category,
    subcategoria: product.subcategory || '',
    genero: legacy.genderByProductId.get(product.id) || '',
    sku: product.code || '',
    precio: product.price,
    habilitado: true,
    stock_mode:
      productSizes.length || hasVariantSizes ? 'size' : 'none',
    orden: productOrder
  });

  (product.images || []).forEach(function(image, imageOrder) {
    imageRows.push({
      producto_id: product.id,
      variante_id: '',
      ruta: image,
      orden: imageOrder
    });
  });

  productSizes.forEach(function(size, sizeOrder) {
    stockRows.push({
      producto_id: product.id,
      variante_id: '',
      talle: size.size,
      stock: size.inStock ? 1 : 0,
      orden: sizeOrder
    });
  });

  variants.forEach(function(variant, variantOrder) {
    variantRows.push({
      producto_id: product.id,
      variante_id: variant.id,
      sku: variant.code || '',
      color_nombre: variant.colorName || '',
      color_hex: variant.colorHex || '',
      precio:
        typeof variant.price === 'number' ? variant.price : null,
      thumbnail: variant.thumbnail || '',
      orden: variantOrder
    });

    (variant.images || []).forEach(function(image, imageOrder) {
      imageRows.push({
        producto_id: product.id,
        variante_id: variant.id,
        ruta: image,
        orden: imageOrder
      });
    });

    (variant.sizes || []).forEach(function(size, sizeOrder) {
      stockRows.push({
        producto_id: product.id,
        variante_id: variant.id,
        talle: size.size,
        stock: size.inStock ? 1 : 0,
        orden: sizeOrder
      });
    });
  });

  let specificationOrder = 0;

  Object.entries(product.specifications || {}).forEach(function(entry) {
    const key = entry[0];
    const rawValue = entry[1];
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    values.forEach(function(value) {
      specificationRows.push({
        producto_id: product.id,
        clave: key,
        etiqueta: technicalLabels[key] || key,
        valor: value,
        orden: specificationOrder
      });
      specificationOrder += 1;
    });
  });
});

function addSheet(name, columns, rows, widths) {
  const worksheet = workbook.addWorksheet(name);

  worksheet.columns = columns.map(function(column) {
    return {
      header: column,
      key: column
    };
  });
  worksheet.addRows(rows);
  styleWorksheet(worksheet, widths);

  return worksheet;
}

const categoriesSheet = addSheet(
  'Categorias',
  [
    'categoria_id',
    'parent_id',
    'label',
    'target',
    'habilitada',
    'product_category',
    'product_subcategory',
    'genero',
    'title',
    'subtitle',
    'data_source',
    'orden'
  ],
  categoryRows,
  [30, 22, 25, 38, 12, 24, 25, 14, 34, 28, 30, 10]
);

const productsSheet = addSheet(
  'Productos',
  [
    'producto_id',
    'nombre',
    'categoria',
    'subcategoria',
    'genero',
    'sku',
    'precio',
    'habilitado',
    'stock_mode',
    'orden'
  ],
  productRows,
  [38, 38, 22, 22, 14, 22, 14, 12, 14, 10]
);

const variantsSheet = addSheet(
  'Variantes',
  [
    'producto_id',
    'variante_id',
    'sku',
    'color_nombre',
    'color_hex',
    'precio',
    'thumbnail',
    'orden'
  ],
  variantRows,
  [38, 24, 22, 24, 14, 14, 55, 10]
);

const imagesSheet = addSheet(
  'Imagenes',
  ['producto_id', 'variante_id', 'ruta', 'orden'],
  imageRows,
  [38, 24, 100, 10]
);

const stockSheet = addSheet(
  'Stock',
  ['producto_id', 'variante_id', 'talle', 'stock', 'orden'],
  stockRows,
  [38, 24, 14, 12, 10]
);

const specificationsSheet = addSheet(
  'Caracteristicas',
  ['producto_id', 'clave', 'etiqueta', 'valor', 'orden'],
  specificationRows,
  [38, 24, 24, 90, 10]
);

const uniqueInEncounterOrder = function(values) {
  return Array.from(new Set(values.filter(Boolean)));
};
const allowedSizes = uniqueInEncounterOrder(
  stockRows.map(function(row) { return row.talle; })
);
const allowedCategories = uniqueInEncounterOrder(
  categoryRows.map(function(row) { return row.product_category; })
);
const allowedSubcategories = uniqueInEncounterOrder(
  categoryRows.map(function(row) {
    return row.product_subcategory;
  })
);
const listRows = [];
const listLength = Math.max(
  3,
  2,
  allowedSizes.length,
  4,
  allowedCategories.length,
  allowedSubcategories.length,
  2
);

for (let index = 0; index < listLength; index += 1) {
  listRows.push({
    generos: ['hombre', 'dama', 'unisex'][index] || '',
    stock_modes: ['none', 'size'][index] || '',
    talles: allowedSizes[index] || '',
    extensiones: ['.webp', '.png', '.jpg', '.jpeg'][index] || '',
    categorias: allowedCategories[index] || '',
    subcategorias: allowedSubcategories[index] || '',
    booleanos: [true, false][index] ?? ''
  });
}

const listsSheet = addSheet(
  'Listas',
  [
    'generos',
    'stock_modes',
    'talles',
    'extensiones',
    'categorias',
    'subcategorias',
    'booleanos'
  ],
  listRows,
  [18, 18, 18, 18, 26, 26, 16]
);

listsSheet.state = 'veryHidden';
productsSheet.getColumn(7).numFmt = '#,##0.00';
variantsSheet.getColumn(6).numFmt = '#,##0.00';
stockSheet.getColumn(4).numFmt = '0';
categoriesSheet.getColumn(12).numFmt = '0';
productsSheet.getColumn(10).numFmt = '0';
variantsSheet.getColumn(8).numFmt = '0';
imagesSheet.getColumn(4).numFmt = '0';
stockSheet.getColumn(5).numFmt = '0';
specificationsSheet.getColumn(5).numFmt = '0';

const validationLastRow = Math.max(productsSheet.rowCount + 200, 500);
setListValidation(
  categoriesSheet,
  5,
  2,
  validationLastRow,
  "'Listas'!$G$2:$G$3"
);
setListValidation(
  categoriesSheet,
  8,
  2,
  validationLastRow,
  "'Listas'!$A$2:$A$4"
);
setListValidation(
  productsSheet,
  3,
  2,
  validationLastRow,
  "'Listas'!$E$2:$E$" + (allowedCategories.length + 1)
);
setListValidation(
  productsSheet,
  4,
  2,
  validationLastRow,
  "'Listas'!$F$2:$F$" + (allowedSubcategories.length + 1)
);
setListValidation(
  productsSheet,
  5,
  2,
  validationLastRow,
  "'Listas'!$A$2:$A$4"
);
setListValidation(
  productsSheet,
  8,
  2,
  validationLastRow,
  "'Listas'!$G$2:$G$3"
);
setListValidation(
  productsSheet,
  9,
  2,
  validationLastRow,
  "'Listas'!$B$2:$B$3"
);
setListValidation(
  stockSheet,
  3,
  2,
  Math.max(stockSheet.rowCount + 500, 1000),
  "'Listas'!$C$2:$C$" + (allowedSizes.length + 1)
);

await fs.mkdir(path.dirname(outputPath), {
  recursive: true
});
await workbook.xlsx.writeFile(outputPath);

console.log('Excel generado: ' + path.relative(repoRoot, outputPath));
console.log('Categorias: ' + categoryRows.length);
console.log('Productos: ' + productRows.length);
console.log('Variantes: ' + variantRows.length);
console.log('Imagenes: ' + imageRows.length);
console.log('Stock: ' + stockRows.length);
console.log('Caracteristicas: ' + specificationRows.length);
console.log('Listas: ' + listRows.length);
