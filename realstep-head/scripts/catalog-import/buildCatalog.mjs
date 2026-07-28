function compareOrdered(left, right) {
  if (left.orden !== right.orden) {
    return left.orden - right.orden;
  }

  const leftId =
    left.producto_id ||
    left.variante_id ||
    left.categoria_id ||
    left.ruta ||
    left.talle ||
    left.clave ||
    '';
  const rightId =
    right.producto_id ||
    right.variante_id ||
    right.categoria_id ||
    right.ruta ||
    right.talle ||
    right.clave ||
    '';

  return String(leftId).localeCompare(String(rightId), 'en');
}

function rowsByKey(rows, keyForRow) {
  const groups = new Map();

  rows.forEach(function(row) {
    const key = keyForRow(row);

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key).push(row);
  });

  groups.forEach(function(group) {
    group.sort(compareOrdered);
  });

  return groups;
}

function buildCategory(row) {
  const category = {
    id: row.categoria_id,
    label: row.label,
    target: row.target,
    enabled: row.habilitada,
    title: row.title,
    subtitle: row.subtitle || '',
    order: row.orden,
    filter: {
      category: row.product_category || null,
      subcategory: row.product_subcategory || null,
      gender: row.genero || null
    }
  };

  if (row.product_category && !row.parent_id) {
    category.productCategory = row.product_category;
  }

  if (row.data_source) {
    category.dataSource = row.data_source;
  }

  return category;
}

function buildCategories(rows) {
  const childrenByParent = rowsByKey(
    rows.filter(function(row) { return row.parent_id; }),
    function(row) { return row.parent_id; }
  );

  return rows
    .filter(function(row) { return !row.parent_id; })
    .sort(compareOrdered)
    .map(function(row) {
      const category = buildCategory(row);
      const children = childrenByParent.get(row.categoria_id) || [];

      if (children.length) {
        category.children = children.map(buildCategory);
      }

      return category;
    });
}

function buildSizes(rows) {
  return rows.map(function(row) {
    return {
      size: row.talle,
      stock: row.stock,
      inStock: row.stock > 0,
      order: row.orden
    };
  });
}

function buildSpecifications(rows) {
  if (!rows.length) {
    return null;
  }

  const valuesByKey = new Map();

  rows.forEach(function(row) {
    if (!valuesByKey.has(row.clave)) {
      valuesByKey.set(row.clave, []);
    }
    valuesByKey.get(row.clave).push(row.valor);
  });

  const result = {};

  valuesByKey.forEach(function(values, key) {
    result[key] = key === 'features' || values.length > 1
      ? values
      : values[0];
  });

  return result;
}

export function buildCatalog(sheets) {
  const variantsByProduct = rowsByKey(
    sheets.Variantes,
    function(row) { return row.producto_id; }
  );
  const imagesByScope = rowsByKey(
    sheets.Imagenes,
    function(row) {
      return (
        row.producto_id + '\u0000' +
        (row.variante_id || '__product__')
      );
    }
  );
  const stockByScope = rowsByKey(
    sheets.Stock,
    function(row) {
      return (
        row.producto_id + '\u0000' +
        (row.variante_id || '__product__')
      );
    }
  );
  const specificationsByProduct = rowsByKey(
    sheets.Caracteristicas,
    function(row) { return row.producto_id; }
  );

  const products = sheets.Productos
    .slice()
    .sort(compareOrdered)
    .map(function(row) {
      const productKey = row.producto_id + '\u0000__product__';
      const productVariants =
        variantsByProduct.get(row.producto_id) || [];
      const product = {
        id: row.producto_id,
        category: row.categoria,
        subcategory: row.subcategoria || null,
        gender: row.genero || null,
        name: row.nombre,
        code: row.sku || null,
        price: row.precio,
        enabled: row.habilitado,
        stockMode: row.stock_mode,
        order: row.orden,
        images: (imagesByScope.get(productKey) || [])
          .map(function(image) { return image.ruta; }),
        sizes: buildSizes(stockByScope.get(productKey) || []),
        specifications: buildSpecifications(
          specificationsByProduct.get(row.producto_id) || []
        ),
        variants: productVariants.map(function(variantRow) {
          const variantKey =
            row.producto_id + '\u0000' + variantRow.variante_id;

          return {
            id: variantRow.variante_id,
            code: variantRow.sku,
            colorName: variantRow.color_nombre,
            colorHex: variantRow.color_hex || null,
            price:
              typeof variantRow.precio === 'number'
                ? variantRow.precio
                : null,
            thumbnail: variantRow.thumbnail || null,
            order: variantRow.orden,
            images: (imagesByScope.get(variantKey) || [])
              .map(function(image) { return image.ruta; }),
            sizes: buildSizes(stockByScope.get(variantKey) || [])
          };
        })
      };

      return product;
    });

  return {
    schemaVersion: 1,
    stockIsAvailabilityOnly: true,
    categories: buildCategories(sheets.Categorias),
    products
  };
}

export function serializeCatalog(catalog) {
  return JSON.stringify(catalog, null, 2) + '\n';
}
