import fs from 'node:fs/promises';
import path from 'node:path';
import { rowLocation } from './diagnostics.mjs';

const IMAGE_EXTENSIONS = new Set([
  '.webp',
  '.png',
  '.jpg',
  '.jpeg'
]);
const VALID_GENDERS = new Set([
  'hombre',
  'dama',
  'unisex'
]);
const VALID_STOCK_MODES = new Set([
  'none',
  'size'
]);
const CURRENTLY_RENDERED_TECH_KEYS = new Set([
  'fit',
  'mainFabric',
  'secondFabric',
  'features'
]);

function isBlank(value) {
  return value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '');
}

function hasText(value) {
  return typeof value === 'string' && value.length > 0;
}

function requireValue(diagnostics, row, column, code, message) {
  if (isBlank(row[column])) {
    diagnostics.error(rowLocation(row, column), code, message);
    return false;
  }

  return true;
}

function requireText(diagnostics, row, column, code, message) {
  if (!requireValue(
    diagnostics,
    row,
    column,
    code,
    message
  )) {
    return false;
  }

  if (!hasText(row[column])) {
    diagnostics.error(
      rowLocation(row, column),
      code,
      message + ' Debe ser texto literal.'
    );
    return false;
  }

  return true;
}

function requireBoolean(
  diagnostics,
  row,
  column,
  code,
  message
) {
  if (typeof row[column] !== 'boolean') {
    diagnostics.error(rowLocation(row, column), code, message);
    return false;
  }

  return true;
}

function validateNonNegativeNumber(
  diagnostics,
  row,
  column,
  options = {}
) {
  const value = row[column];
  const required = options.required !== false;

  if (isBlank(value)) {
    if (required) {
      diagnostics.error(
        rowLocation(row, column),
        options.requiredCode || 'NUMBER_REQUIRED',
        options.requiredMessage || 'El valor numérico es obligatorio.'
      );
    }
    return false;
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    diagnostics.error(
      rowLocation(row, column),
      options.typeCode || 'NUMBER_INVALID',
      options.typeMessage || 'El valor debe ser numérico.'
    );
    return false;
  }

  if (options.integer && !Number.isInteger(value)) {
    diagnostics.error(
      rowLocation(row, column),
      options.integerCode || 'INTEGER_REQUIRED',
      options.integerMessage || 'El valor debe ser un entero.'
    );
    return false;
  }

  if (value < 0) {
    diagnostics.error(
      rowLocation(row, column),
      options.negativeCode || 'NUMBER_NEGATIVE',
      options.negativeMessage ||
        'El valor debe ser mayor o igual que cero.'
    );
    return false;
  }

  return true;
}

function indexUnique(
  diagnostics,
  rows,
  keyForRow,
  locationColumn,
  code,
  messageForRow
) {
  const index = new Map();

  rows.forEach(function(row) {
    const key = keyForRow(row);

    if (key === null) {
      return;
    }

    if (index.has(key)) {
      diagnostics.error(
        rowLocation(row, locationColumn),
        code,
        messageForRow(row, index.get(key))
      );
      return;
    }

    index.set(key, row);
  });

  return index;
}

function validateDuplicateOrders(
  diagnostics,
  rows,
  scopeForRow,
  code
) {
  indexUnique(
    diagnostics,
    rows,
    function(row) {
      if (
        !Number.isInteger(row.orden) ||
        row.orden < 0
      ) {
        return null;
      }

      return scopeForRow(row) + '\u0000' + row.orden;
    },
    'orden',
    code,
    function(row, previous) {
      return (
        'El orden ' + row.orden +
        ' está duplicado dentro del mismo alcance. Primera aparición: ' +
        previous._sheet + '!' + previous._cells.orden + '.'
      );
    }
  );
}

function collectAllowedValues(rows, column) {
  return new Set(
    rows
      .map(function(row) { return row[column]; })
      .filter(function(value) { return !isBlank(value); })
  );
}

async function pathHasExactCase(repoRoot, relativePath) {
  const segments = relativePath.split('/');
  let currentPath = repoRoot;

  for (const segment of segments) {
    let entries;

    try {
      entries = await fs.readdir(currentPath);
    } catch (error) {
      return false;
    }

    if (!entries.includes(segment)) {
      return false;
    }

    currentPath = path.join(currentPath, segment);
  }

  try {
    return (await fs.stat(currentPath)).isFile();
  } catch (error) {
    return false;
  }
}

async function pathExistsIgnoringCase(repoRoot, relativePath) {
  const segments = relativePath.split('/');
  let currentPath = repoRoot;

  for (const segment of segments) {
    let entries;

    try {
      entries = await fs.readdir(currentPath);
    } catch (error) {
      return false;
    }

    const matchingEntry = entries.find(function(entry) {
      return entry.toLowerCase() === segment.toLowerCase();
    });

    if (!matchingEntry) {
      return false;
    }

    currentPath = path.join(currentPath, matchingEntry);
  }

  try {
    return (await fs.stat(currentPath)).isFile();
  } catch (error) {
    return false;
  }
}

async function walkFiles(directory) {
  let entries;

  try {
    entries = await fs.readdir(directory, {
      withFileTypes: true
    });
  } catch (error) {
    return [];
  }

  const nested = await Promise.all(entries.map(async function(entry) {
    const absolute = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(absolute);
    }

    return [absolute];
  }));

  return nested.flat();
}

function validateCategoryRows(rows, diagnostics) {
  rows.forEach(function(row) {
    requireText(
      diagnostics,
      row,
      'categoria_id',
      'CATEGORY_ID_REQUIRED',
      'El ID de categoría es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'label',
      'CATEGORY_LABEL_REQUIRED',
      'La etiqueta de categoría es obligatoria.'
    );
    requireText(
      diagnostics,
      row,
      'target',
      'CATEGORY_TARGET_REQUIRED',
      'El target de categoría es obligatorio.'
    );
    requireBoolean(
      diagnostics,
      row,
      'habilitada',
      'CATEGORY_ENABLED_INVALID',
      'habilitada debe ser un booleano literal.'
    );
    requireText(
      diagnostics,
      row,
      'title',
      'CATEGORY_TITLE_REQUIRED',
      'El título de categoría es obligatorio.'
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'orden',
      {
        integer: true,
        requiredCode: 'CATEGORY_ORDER_REQUIRED',
        typeCode: 'CATEGORY_ORDER_INVALID',
        integerCode: 'CATEGORY_ORDER_INVALID',
        negativeCode: 'CATEGORY_ORDER_NEGATIVE',
        requiredMessage: 'El orden de categoría es obligatorio.',
        typeMessage: 'El orden de categoría debe ser numérico.',
        integerMessage: 'El orden de categoría debe ser entero.',
        negativeMessage:
          'El orden de categoría debe ser mayor o igual que cero.'
      }
    );

    if (
      !isBlank(row.genero) &&
      !VALID_GENDERS.has(row.genero)
    ) {
      diagnostics.error(
        rowLocation(row, 'genero'),
        'CATEGORY_GENDER_INVALID',
        'Género permitido: hombre, dama o unisex.'
      );
    }
  });

  const categoryIndex = indexUnique(
    diagnostics,
    rows,
    function(row) {
      return hasText(row.categoria_id) ? row.categoria_id : null;
    },
    'categoria_id',
    'CATEGORY_ID_DUPLICATE',
    function(row, previous) {
      return (
        'El ID de categoría está duplicado. Primera aparición: ' +
        previous._sheet + '!' + previous._cells.categoria_id + '.'
      );
    }
  );

  indexUnique(
    diagnostics,
    rows,
    function(row) {
      return hasText(row.target) ? row.target : null;
    },
    'target',
    'CATEGORY_TARGET_DUPLICATE',
    function(row, previous) {
      return (
        'El target está duplicado. Primera aparición: ' +
        previous._sheet + '!' + previous._cells.target + '.'
      );
    }
  );

  rows.forEach(function(row) {
    if (
      !isBlank(row.parent_id) &&
      !categoryIndex.has(row.parent_id)
    ) {
      diagnostics.error(
        rowLocation(row, 'parent_id'),
        'CATEGORY_PARENT_NOT_FOUND',
        'La categoría padre "' + row.parent_id + '" no existe.'
      );
    }

    if (row.parent_id === row.categoria_id) {
      diagnostics.error(
        rowLocation(row, 'parent_id'),
        'CATEGORY_PARENT_SELF_REFERENCE',
        'Una categoría no puede ser su propia categoría padre.'
      );
    }
  });

  validateDuplicateOrders(
    diagnostics,
    rows,
    function(row) {
      return row.parent_id || '__root__';
    },
    'CATEGORY_ORDER_DUPLICATE'
  );

  return categoryIndex;
}

function validateProductRows(rows, diagnostics) {
  rows.forEach(function(row) {
    requireText(
      diagnostics,
      row,
      'producto_id',
      'PRODUCT_ID_REQUIRED',
      'El ID de producto es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'nombre',
      'PRODUCT_NAME_REQUIRED',
      'El nombre del producto es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'categoria',
      'PRODUCT_CATEGORY_REQUIRED',
      'La categoría del producto es obligatoria.'
    );
    requireBoolean(
      diagnostics,
      row,
      'habilitado',
      'PRODUCT_ENABLED_INVALID',
      'habilitado debe ser un booleano literal.'
    );

    validateNonNegativeNumber(
      diagnostics,
      row,
      'precio',
      {
        requiredCode: 'PRODUCT_PRICE_REQUIRED',
        typeCode: 'PRODUCT_PRICE_INVALID',
        negativeCode: 'PRODUCT_PRICE_NEGATIVE',
        requiredMessage: 'El precio es obligatorio.',
        typeMessage: 'El precio debe ser numérico.',
        negativeMessage: 'El precio no puede ser negativo.'
      }
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'orden',
      {
        integer: true,
        requiredCode: 'PRODUCT_ORDER_REQUIRED',
        typeCode: 'PRODUCT_ORDER_INVALID',
        integerCode: 'PRODUCT_ORDER_INVALID',
        negativeCode: 'PRODUCT_ORDER_NEGATIVE',
        requiredMessage: 'El orden del producto es obligatorio.',
        typeMessage: 'El orden del producto debe ser numérico.',
        integerMessage: 'El orden del producto debe ser entero.',
        negativeMessage:
          'El orden del producto debe ser mayor o igual que cero.'
      }
    );

    if (!isBlank(row.pack_de)) {
      if (
        typeof row.pack_de !== 'number' ||
        !Number.isFinite(row.pack_de) ||
        !Number.isInteger(row.pack_de) ||
        row.pack_de < 1
      ) {
        diagnostics.error(
          rowLocation(row, 'pack_de'),
          'PRODUCT_PACK_INVALID',
          'pack_de del producto "' + row.producto_id +
            '" debe ser un entero positivo mayor o igual que 1.'
        );
      }
    }

    if (!VALID_STOCK_MODES.has(row.stock_mode)) {
      diagnostics.error(
        rowLocation(row, 'stock_mode'),
        'STOCK_MODE_INVALID',
        'stock_mode debe ser "none" o "size".'
      );
    }

    if (
      !isBlank(row.genero) &&
      !VALID_GENDERS.has(row.genero)
    ) {
      diagnostics.error(
        rowLocation(row, 'genero'),
        'PRODUCT_GENDER_INVALID',
        'Género permitido: hombre, dama o unisex.'
      );
    }

    if (row.habilitado === true && row.precio === 0) {
      diagnostics.warn(
        rowLocation(row, 'precio'),
        'ACTIVE_PRODUCT_ZERO_PRICE',
        'El producto está habilitado pero su precio es 0.'
      );
    }

    if (row.sku === 'PENDIENTE') {
      diagnostics.warn(
        rowLocation(row, 'sku'),
        'PENDING_CODE',
        'El código del producto está marcado como PENDIENTE.'
      );
    }
  });

  const productIndex = indexUnique(
    diagnostics,
    rows,
    function(row) {
      return hasText(row.producto_id) ? row.producto_id : null;
    },
    'producto_id',
    'PRODUCT_ID_DUPLICATE',
    function(row, previous) {
      return (
        'El ID de producto está duplicado. Primera aparición: ' +
        previous._sheet + '!' + previous._cells.producto_id + '.'
      );
    }
  );

  validateDuplicateOrders(
    diagnostics,
    rows,
    function() {
      return '__all_products__';
    },
    'PRODUCT_ORDER_DUPLICATE'
  );

  return productIndex;
}

function validateVariantRows(rows, productIndex, diagnostics) {
  rows.forEach(function(row) {
    requireText(
      diagnostics,
      row,
      'producto_id',
      'VARIANT_PRODUCT_REQUIRED',
      'El producto de la variante es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'variante_id',
      'VARIANT_ID_REQUIRED',
      'El ID de variante es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'sku',
      'VARIANT_CODE_REQUIRED',
      'Toda variante debe tener código.'
    );
    requireText(
      diagnostics,
      row,
      'color_nombre',
      'VARIANT_COLOR_NAME_REQUIRED',
      'El nombre del color es obligatorio.'
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'precio',
      {
        required: false,
        typeCode: 'VARIANT_PRICE_INVALID',
        negativeCode: 'VARIANT_PRICE_NEGATIVE',
        typeMessage: 'El precio de variante debe ser numérico.',
        negativeMessage:
          'El precio de variante no puede ser negativo.'
      }
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'orden',
      {
        integer: true,
        requiredCode: 'VARIANT_ORDER_REQUIRED',
        typeCode: 'VARIANT_ORDER_INVALID',
        integerCode: 'VARIANT_ORDER_INVALID',
        negativeCode: 'VARIANT_ORDER_NEGATIVE'
      }
    );

    if (
      hasText(row.color_hex) &&
      !/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(
        row.color_hex
      )
    ) {
      diagnostics.error(
        rowLocation(row, 'color_hex'),
        'VARIANT_COLOR_HEX_INVALID',
        'El color debe usar #RGB, #RGBA, #RRGGBB o #RRGGBBAA.'
      );
    }

    if (
      hasText(row.producto_id) &&
      !productIndex.has(row.producto_id)
    ) {
      diagnostics.error(
        rowLocation(row, 'producto_id'),
        'VARIANT_PRODUCT_NOT_FOUND',
        'El producto "' + row.producto_id + '" no existe.'
      );
    }

    if (row.sku === 'PENDIENTE') {
      diagnostics.warn(
        rowLocation(row, 'sku'),
        'PENDING_CODE',
        'El código de la variante está marcado como PENDIENTE.'
      );
    }
  });

  const variantIndex = indexUnique(
    diagnostics,
    rows,
    function(row) {
      if (!hasText(row.producto_id) || !hasText(row.variante_id)) {
        return null;
      }

      return row.producto_id + '\u0000' + row.variante_id;
    },
    'variante_id',
    'VARIANT_ID_DUPLICATE',
    function(row, previous) {
      return (
        'La variante está duplicada dentro del producto. ' +
        'Primera aparición: ' +
        previous._sheet + '!' + previous._cells.variante_id + '.'
      );
    }
  );

  validateDuplicateOrders(
    diagnostics,
    rows,
    function(row) {
      return row.producto_id || '__missing_product__';
    },
    'VARIANT_ORDER_DUPLICATE'
  );

  return variantIndex;
}

async function validateImageRows(
  rows,
  productIndex,
  variantIndex,
  diagnostics,
  repoRoot
) {
  const referencedPaths = new Set();

  for (const row of rows) {
    requireText(
      diagnostics,
      row,
      'producto_id',
      'IMAGE_PRODUCT_REQUIRED',
      'El producto de la imagen es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'ruta',
      'IMAGE_PATH_REQUIRED',
      'La ruta de imagen es obligatoria.'
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'orden',
      {
        integer: true,
        requiredCode: 'IMAGE_ORDER_REQUIRED',
        typeCode: 'IMAGE_ORDER_INVALID',
        integerCode: 'IMAGE_ORDER_INVALID',
        negativeCode: 'IMAGE_ORDER_NEGATIVE'
      }
    );

    if (
      hasText(row.producto_id) &&
      !productIndex.has(row.producto_id)
    ) {
      diagnostics.error(
        rowLocation(row, 'producto_id'),
        'IMAGE_PRODUCT_NOT_FOUND',
        'El producto "' + row.producto_id + '" no existe.'
      );
    }

    if (!isBlank(row.variante_id)) {
      const variantKey =
        row.producto_id + '\u0000' + row.variante_id;

      if (!variantIndex.has(variantKey)) {
        diagnostics.error(
          rowLocation(row, 'variante_id'),
          'IMAGE_VARIANT_NOT_FOUND',
          'La variante "' + row.variante_id +
            '" no existe dentro del producto.'
        );
      }
    }

    if (!hasText(row.ruta)) {
      continue;
    }

    const extension = path.extname(row.ruta).toLowerCase();

    if (!IMAGE_EXTENSIONS.has(extension)) {
      diagnostics.error(
        rowLocation(row, 'ruta'),
        'IMAGE_EXTENSION_INVALID',
        'Extensiones permitidas: .webp, .png, .jpg y .jpeg.'
      );
    }

    if (
      row.ruta.includes('\\') ||
      path.isAbsolute(row.ruta) ||
      row.ruta.split('/').includes('..') ||
      !row.ruta.startsWith('assets/products/')
    ) {
      diagnostics.error(
        rowLocation(row, 'ruta'),
        'IMAGE_PATH_INVALID',
        'La imagen debe usar una ruta relativa bajo assets/products/.'
      );
      continue;
    }

    const absolutePath = path.resolve(repoRoot, row.ruta);
    const productsRoot =
      path.resolve(repoRoot, 'assets', 'products') + path.sep;

    if (!absolutePath.startsWith(productsRoot)) {
      diagnostics.error(
        rowLocation(row, 'ruta'),
        'IMAGE_PATH_OUTSIDE_PRODUCTS',
        'La ruta sale del directorio assets/products.'
      );
      continue;
    }

    if (!(await pathHasExactCase(repoRoot, row.ruta))) {
      if (await pathExistsIgnoringCase(repoRoot, row.ruta)) {
        diagnostics.error(
          rowLocation(row, 'ruta'),
          'IMAGE_PATH_CASE_MISMATCH',
          'La capitalización de la ruta no coincide exactamente con el archivo.'
        );
      } else {
        diagnostics.error(
          rowLocation(row, 'ruta'),
          'IMAGE_NOT_FOUND',
          'No existe el archivo "' + row.ruta + '".'
        );
      }
      continue;
    }

    referencedPaths.add(path.normalize(absolutePath).toLowerCase());
  }

  validateDuplicateOrders(
    diagnostics,
    rows,
    function(row) {
      return (
        (row.producto_id || '__missing_product__') + '\u0000' +
        (row.variante_id || '__product__')
      );
    },
    'IMAGE_ORDER_DUPLICATE'
  );

  const assetFiles = await walkFiles(
    path.join(repoRoot, 'assets', 'products')
  );

  assetFiles.forEach(function(absolutePath) {
    if (
      !referencedPaths.has(
        path.normalize(absolutePath).toLowerCase()
      )
    ) {
      diagnostics.warn(
        {
          sheet: 'Imagenes',
          cell: '-',
          column: 'ruta'
        },
        'UNUSED_IMAGE',
        'La imagen no está referenciada: ' +
          path.relative(repoRoot, absolutePath).replaceAll('\\', '/')
      );
    }
  });
}

function validateStockRows(
  rows,
  productIndex,
  variantIndex,
  allowedSizes,
  diagnostics
) {
  rows.forEach(function(row) {
    requireText(
      diagnostics,
      row,
      'producto_id',
      'STOCK_PRODUCT_REQUIRED',
      'El producto del stock es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'talle',
      'STOCK_SIZE_REQUIRED',
      'El talle es obligatorio.'
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'stock',
      {
        integer: true,
        requiredCode: 'STOCK_REQUIRED',
        typeCode: 'STOCK_INVALID',
        integerCode: 'STOCK_DECIMAL',
        negativeCode: 'STOCK_NEGATIVE',
        requiredMessage: 'El stock es obligatorio.',
        typeMessage: 'El stock debe ser numérico.',
        integerMessage: 'El stock debe ser un entero.',
        negativeMessage:
          'El stock debe ser un entero no negativo.'
      }
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'orden',
      {
        integer: true,
        requiredCode: 'STOCK_ORDER_REQUIRED',
        typeCode: 'STOCK_ORDER_INVALID',
        integerCode: 'STOCK_ORDER_INVALID',
        negativeCode: 'STOCK_ORDER_NEGATIVE'
      }
    );

    if (
      hasText(row.producto_id) &&
      !productIndex.has(row.producto_id)
    ) {
      diagnostics.error(
        rowLocation(row, 'producto_id'),
        'STOCK_PRODUCT_NOT_FOUND',
        'El producto "' + row.producto_id + '" no existe.'
      );
    }

    if (!isBlank(row.variante_id)) {
      const variantKey =
        row.producto_id + '\u0000' + row.variante_id;

      if (!variantIndex.has(variantKey)) {
        diagnostics.error(
          rowLocation(row, 'variante_id'),
          'STOCK_VARIANT_NOT_FOUND',
          'La variante "' + row.variante_id +
            '" no existe dentro del producto.'
        );
      }
    }

    if (hasText(row.talle) && !allowedSizes.has(row.talle)) {
      diagnostics.error(
        rowLocation(row, 'talle'),
        'STOCK_SIZE_INVALID',
        'El talle no está incluido en la hoja Listas.'
      );
    }
  });

  indexUnique(
    diagnostics,
    rows,
    function(row) {
      if (!hasText(row.producto_id) || !hasText(row.talle)) {
        return null;
      }

      return (
        row.producto_id + '\u0000' +
        (row.variante_id || '__product__') + '\u0000' +
        row.talle
      );
    },
    'talle',
    'STOCK_SIZE_DUPLICATE',
    function(row, previous) {
      return (
        'El talle está duplicado para el mismo producto y variante. ' +
        'Primera aparición: ' +
        previous._sheet + '!' + previous._cells.talle + '.'
      );
    }
  );

  validateDuplicateOrders(
    diagnostics,
    rows,
    function(row) {
      return (
        (row.producto_id || '__missing_product__') + '\u0000' +
        (row.variante_id || '__product__')
      );
    },
    'STOCK_ORDER_DUPLICATE'
  );
}

function validateSpecificationRows(
  rows,
  productIndex,
  diagnostics
) {
  rows.forEach(function(row) {
    requireText(
      diagnostics,
      row,
      'producto_id',
      'TECH_PRODUCT_REQUIRED',
      'El producto de la característica es obligatorio.'
    );
    requireText(
      diagnostics,
      row,
      'clave',
      'TECH_KEY_REQUIRED',
      'La clave técnica es obligatoria.'
    );
    requireText(
      diagnostics,
      row,
      'etiqueta',
      'TECH_LABEL_REQUIRED',
      'La etiqueta técnica es obligatoria.'
    );
    requireText(
      diagnostics,
      row,
      'valor',
      'TECH_VALUE_REQUIRED',
      'El valor técnico es obligatorio.'
    );
    validateNonNegativeNumber(
      diagnostics,
      row,
      'orden',
      {
        integer: true,
        requiredCode: 'TECH_ORDER_REQUIRED',
        typeCode: 'TECH_ORDER_INVALID',
        integerCode: 'TECH_ORDER_INVALID',
        negativeCode: 'TECH_ORDER_NEGATIVE'
      }
    );

    if (
      hasText(row.producto_id) &&
      !productIndex.has(row.producto_id)
    ) {
      diagnostics.error(
        rowLocation(row, 'producto_id'),
        'TECH_PRODUCT_NOT_FOUND',
        'El producto "' + row.producto_id + '" no existe.'
      );
    }

    if (
      hasText(row.clave) &&
      !CURRENTLY_RENDERED_TECH_KEYS.has(row.clave)
    ) {
      diagnostics.warn(
        rowLocation(row, 'clave'),
        'TECH_NOT_CURRENTLY_RENDERED',
        'La aplicación clásica no muestra actualmente la clave "' +
          row.clave + '". El dato se conservará en el JSON.'
      );
    }
  });

  validateDuplicateOrders(
    diagnostics,
    rows,
    function(row) {
      return row.producto_id || '__missing_product__';
    },
    'TECH_ORDER_DUPLICATE'
  );
}

function validateCategoryAssignments(
  products,
  categories,
  diagnostics
) {
  const productCategories = new Set(
    categories
      .map(function(row) { return row.product_category; })
      .filter(function(value) { return !isBlank(value); })
  );
  const subcategoriesByCategory = new Map();
  const gendersByCategory = new Map();

  categories.forEach(function(row) {
    if (!isBlank(row.product_subcategory)) {
      if (!subcategoriesByCategory.has(row.product_category)) {
        subcategoriesByCategory.set(row.product_category, new Set());
      }
      subcategoriesByCategory
        .get(row.product_category)
        .add(row.product_subcategory);
    }

    if (!isBlank(row.genero)) {
      if (!gendersByCategory.has(row.product_category)) {
        gendersByCategory.set(row.product_category, new Set());
      }
      gendersByCategory.get(row.product_category).add(row.genero);
    }
  });

  products.forEach(function(product) {
    if (!productCategories.has(product.categoria)) {
      diagnostics.error(
        rowLocation(product, 'categoria'),
        'PRODUCT_CATEGORY_INVALID',
        'La categoría "' + product.categoria +
          '" no está definida en Categorias.'
      );
      return;
    }

    const allowedSubcategories =
      subcategoriesByCategory.get(product.categoria);

    if (allowedSubcategories) {
      if (
        isBlank(product.subcategoria) ||
        !allowedSubcategories.has(product.subcategoria)
      ) {
        diagnostics.error(
          rowLocation(product, 'subcategoria'),
          'PRODUCT_SUBCATEGORY_INVALID',
          'La subcategoría debe coincidir con una subcategoría ' +
            'configurada para "' + product.categoria + '".'
        );
      }
    } else if (!isBlank(product.subcategoria)) {
      diagnostics.error(
        rowLocation(product, 'subcategoria'),
        'PRODUCT_SUBCATEGORY_INVALID',
        'La categoría no admite la subcategoría indicada.'
      );
    }

    const allowedGenders = gendersByCategory.get(product.categoria);

    if (allowedGenders) {
      if (
        isBlank(product.genero) ||
        !allowedGenders.has(product.genero)
      ) {
        diagnostics.error(
          rowLocation(product, 'genero'),
          'PRODUCT_GENDER_UNREACHABLE',
          'El género debe coincidir con una sección configurada para "' +
            product.categoria + '".'
        );
      }
    } else if (!isBlank(product.genero)) {
      diagnostics.error(
        rowLocation(product, 'genero'),
        'PRODUCT_GENDER_INVALID_FOR_CATEGORY',
        'La categoría no utiliza género.'
      );
    }
  });
}

function validateProductCompleteness(
  products,
  variants,
  images,
  stock,
  diagnostics
) {
  const variantsByProduct = new Map();
  const imagesByScope = new Map();
  const stockByScope = new Map();

  variants.forEach(function(row) {
    if (!variantsByProduct.has(row.producto_id)) {
      variantsByProduct.set(row.producto_id, []);
    }
    variantsByProduct.get(row.producto_id).push(row);
  });

  images.forEach(function(row) {
    const key =
      row.producto_id + '\u0000' +
      (row.variante_id || '__product__');
    imagesByScope.set(key, (imagesByScope.get(key) || 0) + 1);
  });

  stock.forEach(function(row) {
    const key =
      row.producto_id + '\u0000' +
      (row.variante_id || '__product__');
    stockByScope.set(key, (stockByScope.get(key) || 0) + 1);
  });

  products.forEach(function(product) {
    const productVariants =
      variantsByProduct.get(product.producto_id) || [];
    const productImageKey =
      product.producto_id + '\u0000__product__';
    const productStockKey =
      product.producto_id + '\u0000__product__';

    if (!productVariants.length && isBlank(product.sku)) {
      diagnostics.error(
        rowLocation(product, 'sku'),
        'PRODUCT_CODE_REQUIRED',
        'Un producto sin variantes debe tener código.'
      );
    }

    if (product.habilitado === true) {
      if (productVariants.length) {
        productVariants.forEach(function(variant) {
          const variantKey =
            product.producto_id + '\u0000' + variant.variante_id;
          const hasImages = imagesByScope.has(variantKey);

          if (!hasImages) {
            diagnostics.error(
              rowLocation(product, 'producto_id'),
              'ACTIVE_PRODUCT_WITHOUT_IMAGES',
              'La variante "' + variant.variante_id +
                '" del producto activo no tiene imágenes.'
            );
          }
        });
      } else if (!imagesByScope.has(productImageKey)) {
        diagnostics.error(
          rowLocation(product, 'producto_id'),
          'ACTIVE_PRODUCT_WITHOUT_IMAGES',
          'El producto activo no tiene imágenes.'
        );
      }
    }

    if (product.stock_mode === 'size') {
      if (productVariants.length) {
        productVariants.forEach(function(variant) {
          const key =
            product.producto_id + '\u0000' + variant.variante_id;

          if (!stockByScope.has(key)) {
            diagnostics.error(
              rowLocation(product, 'stock_mode'),
              'SIZE_STOCK_MISSING',
              'La variante "' + variant.variante_id +
                '" no tiene filas de stock por talle.'
            );
          }
        });
      } else if (!stockByScope.has(productStockKey)) {
        diagnostics.error(
          rowLocation(product, 'stock_mode'),
          'SIZE_STOCK_MISSING',
          'El producto no tiene filas de stock por talle.'
        );
      }
    }

    if (product.stock_mode === 'none') {
      const hasUnexpectedStock = stock.some(function(row) {
        return row.producto_id === product.producto_id;
      });

      if (hasUnexpectedStock) {
        diagnostics.error(
          rowLocation(product, 'stock_mode'),
          'STOCK_NOT_ALLOWED',
          'Un producto con stock_mode "none" no debe tener talles.'
        );
      }
    }
  });
}

export async function validateWorkbookData(
  sheets,
  diagnostics,
  options
) {
  const categories = sheets.Categorias || [];
  const products = sheets.Productos || [];
  const variants = sheets.Variantes || [];
  const images = sheets.Imagenes || [];
  const stock = sheets.Stock || [];
  const specifications = sheets.Caracteristicas || [];
  const lists = sheets.Listas || [];

  validateCategoryRows(categories, diagnostics);
  const productIndex = validateProductRows(products, diagnostics);
  const variantIndex = validateVariantRows(
    variants,
    productIndex,
    diagnostics
  );
  const allowedSizes = collectAllowedValues(lists, 'talles');

  await validateImageRows(
    images,
    productIndex,
    variantIndex,
    diagnostics,
    options.repoRoot
  );
  validateStockRows(
    stock,
    productIndex,
    variantIndex,
    allowedSizes,
    diagnostics
  );
  validateSpecificationRows(
    specifications,
    productIndex,
    diagnostics
  );
  validateCategoryAssignments(products, categories, diagnostics);
  validateProductCompleteness(
    products,
    variants,
    images,
    stock,
    diagnostics
  );

  return {
    categories: categories.length,
    products: products.length,
    variants: variants.length,
    images: images.length,
    stock: stock.length,
    specifications: specifications.length,
    listRows: lists.length
  };
}
