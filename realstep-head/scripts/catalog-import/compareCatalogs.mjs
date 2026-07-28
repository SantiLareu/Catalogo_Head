import { generalLocation } from './diagnostics.mjs';

export const EXPECTED_BASELINE_COUNTS = {
  products: 55,
  variants: 88,
  stock: 382,
  images: 257
};

function countGenerated(catalog) {
  return catalog.products.reduce(function(counts, product) {
    counts.products += 1;
    counts.variants += product.variants.length;
    counts.images += product.images.length;
    counts.stock += product.sizes.length;

    product.variants.forEach(function(variant) {
      counts.images += variant.images.length;
      counts.stock += variant.sizes.length;
    });

    return counts;
  }, {
    products: 0,
    variants: 0,
    stock: 0,
    images: 0
  });
}

function normalizeLegacyCategory(category, order) {
  const normalized = {
    id: category.id,
    label: category.label,
    target: category.target,
    enabled: category.enabled,
    productCategory: category.productCategory || null,
    title: category.title,
    subtitle: category.subtitle || '',
    dataSource: category.dataSource || null,
    order
  };

  if (Array.isArray(category.children)) {
    normalized.children = category.children.map(function(child, index) {
      return normalizeLegacyCategory(child, index);
    });
  }

  return normalized;
}

function normalizeGeneratedCategory(category) {
  const normalized = {
    id: category.id,
    label: category.label,
    target: category.target,
    enabled: category.enabled,
    productCategory: category.productCategory || null,
    title: category.title,
    subtitle: category.subtitle || '',
    dataSource: category.dataSource || null,
    order: category.order
  };

  if (Array.isArray(category.children)) {
    normalized.children = category.children.map(
      normalizeGeneratedCategory
    );
  }

  return normalized;
}

function normalizeSpecifications(value) {
  if (!value) {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function normalizeLegacyProducts(legacy) {
  return legacy.products.map(function(product, productOrder) {
    return {
      id: product.id,
      category: product.category,
      subcategory: product.subcategory || null,
      gender: legacy.genderByProductId.get(product.id) || null,
      name: product.name,
      code: product.code || null,
      price: product.price,
      order: productOrder,
      images: (product.images || []).slice(),
      sizes: (product.sizes || []).map(function(size, order) {
        return {
          size: size.size,
          stock: size.inStock ? 1 : 0,
          inStock: size.inStock,
          order
        };
      }),
      specifications: normalizeSpecifications(
        product.specifications
      ),
      variants: (product.variants || []).map(
        function(variant, variantOrder) {
          return {
            id: variant.id,
            code: variant.code || null,
            colorName: variant.colorName || null,
            colorHex: variant.colorHex || null,
            price:
              typeof variant.price === 'number'
                ? variant.price
                : null,
            thumbnail: variant.thumbnail || null,
            order: variantOrder,
            images: (variant.images || []).slice(),
            sizes: (variant.sizes || []).map(
              function(size, sizeOrder) {
                return {
                  size: size.size,
                  stock: size.inStock ? 1 : 0,
                  inStock: size.inStock,
                  order: sizeOrder
                };
              }
            )
          };
        }
      )
    };
  });
}

function normalizeGeneratedProducts(catalog) {
  return catalog.products.map(function(product) {
    return {
      id: product.id,
      category: product.category,
      subcategory: product.subcategory,
      gender: product.gender,
      name: product.name,
      code: product.code,
      price: product.price,
      order: product.order,
      images: product.images,
      sizes: product.sizes,
      specifications: product.specifications,
      variants: product.variants
    };
  });
}

function describe(value) {
  if (value === undefined) {
    return 'undefined';
  }

  return JSON.stringify(value);
}

function collectDifferences(expected, actual, currentPath, results) {
  if (
    expected === null ||
    actual === null ||
    typeof expected !== 'object' ||
    typeof actual !== 'object'
  ) {
    if (!Object.is(expected, actual)) {
      results.push(
        currentPath + ': esperado ' + describe(expected) +
        ', obtenido ' + describe(actual)
      );
    }
    return;
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      results.push(
        currentPath + ': tipo esperado ' +
        (Array.isArray(expected) ? 'array' : typeof expected) +
        ', obtenido ' +
        (Array.isArray(actual) ? 'array' : typeof actual)
      );
      return;
    }

    if (expected.length !== actual.length) {
      results.push(
        currentPath + '.length: esperado ' + expected.length +
        ', obtenido ' + actual.length
      );
    }

    const length = Math.max(expected.length, actual.length);

    for (let index = 0; index < length; index += 1) {
      collectDifferences(
        expected[index],
        actual[index],
        currentPath + '[' + index + ']',
        results
      );
    }
    return;
  }

  const keys = Array.from(new Set(
    Object.keys(expected).concat(Object.keys(actual))
  )).sort();

  keys.forEach(function(key) {
    collectDifferences(
      expected[key],
      actual[key],
      currentPath ? currentPath + '.' + key : key,
      results
    );
  });
}

export function compareLegacyToCatalog(
  legacy,
  catalog,
  diagnostics
) {
  const counts = countGenerated(catalog);

  Object.entries(EXPECTED_BASELINE_COUNTS).forEach(function(entry) {
    const key = entry[0];
    const expected = entry[1];

    if (counts[key] !== expected) {
      diagnostics.error(
        generalLocation('Comparacion'),
        'BASELINE_COUNT_MISMATCH',
        key + ': esperado ' + expected +
          ', obtenido ' + counts[key] + '.'
      );
    }
  });

  const expected = {
    categories: legacy.categories.map(normalizeLegacyCategory),
    products: normalizeLegacyProducts(legacy)
  };
  const actual = {
    categories: catalog.categories.map(normalizeGeneratedCategory),
    products: normalizeGeneratedProducts(catalog)
  };
  const differences = [];

  collectDifferences(expected, actual, '', differences);

  differences.forEach(function(difference) {
    diagnostics.error(
      generalLocation('Comparacion'),
      'LEGACY_DATA_MISMATCH',
      difference
    );
  });

  return {
    counts,
    differences
  };
}
