import fs from 'node:fs/promises';
import path from 'node:path';
import { serializeCatalog } from './buildCatalog.mjs';
import { writeOutputSafely } from './writeOutput.mjs';

export const APPROVED_CATALOG_COUNTS = {
  products: 55,
  variants: 88,
  stock: 382,
  images: 257,
  specifications: 119
};

export function countCatalog(catalog) {
  return (catalog?.products || []).reduce(function(counts, product) {
    counts.products += 1;
    counts.variants += product.variants.length;
    counts.images += product.images.length;
    counts.stock += product.sizes.length;

    if (product.specifications) {
      Object.values(product.specifications).forEach(function(value) {
        counts.specifications += Array.isArray(value) ? value.length : 1;
      });
    }

    product.variants.forEach(function(variant) {
      counts.images += variant.images.length;
      counts.stock += variant.sizes.length;
    });

    return counts;
  }, {
    products: 0,
    variants: 0,
    stock: 0,
    images: 0,
    specifications: 0
  });
}

function describe(value) {
  return value === undefined ? 'undefined' : JSON.stringify(value);
}

function arrayItemPath(parentPath, parentKey, item, index) {
  if (parentKey === 'products' && item?.id != null) {
    return parentPath + '[' + String(item.id) + ']';
  }
  if (parentKey === 'variants' && item?.id != null) {
    return parentPath + '[' + JSON.stringify(String(item.id)) + ']';
  }
  if (parentKey === 'categories' && item?.id != null) {
    return parentPath + '[' + String(item.id) + ']';
  }
  if (parentKey === 'children' && item?.id != null) {
    return parentPath + '[' + String(item.id) + ']';
  }
  if (parentKey === 'sizes' && item?.size != null) {
    return parentPath + '[' + JSON.stringify(String(item.size)) + ']';
  }
  return parentPath + '[' + index + ']';
}

function collectDifferences(expected, actual, currentPath, parentKey, results) {
  if (
    expected === null ||
    actual === null ||
    typeof expected !== 'object' ||
    typeof actual !== 'object'
  ) {
    if (!Object.is(expected, actual)) {
      results.push({ path: currentPath, expected, actual });
    }
    return;
  }

  if (Array.isArray(expected) || Array.isArray(actual)) {
    if (!Array.isArray(expected) || !Array.isArray(actual)) {
      results.push({ path: currentPath, expected, actual });
      return;
    }

    if (expected.length !== actual.length) {
      results.push({
        path: currentPath + '.length',
        expected: expected.length,
        actual: actual.length
      });
    }

    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      const item = expected[index] ?? actual[index];
      collectDifferences(
        expected[index],
        actual[index],
        arrayItemPath(currentPath, parentKey, item, index),
        null,
        results
      );
    }
    return;
  }

  const keys = Array.from(new Set([
    ...Object.keys(expected),
    ...Object.keys(actual)
  ])).sort();

  for (const key of keys) {
    collectDifferences(
      expected[key],
      actual[key],
      currentPath ? currentPath + '.' + key : key,
      key,
      results
    );
  }
}

export function compareCatalogs(expected, actual) {
  const differences = [];
  collectDifferences(expected, actual, '', null, differences);
  return differences;
}

export function formatCatalogDifference(difference) {
  return (
    difference.path + ': esperado ' + describe(difference.expected) +
    ', recibido ' + describe(difference.actual)
  );
}

export async function readCatalogFile(filePath, label = 'catálogo') {
  let source;
  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(
        'No existe ' + label + ': ' + filePath,
        { cause: error }
      );
    }
    throw error;
  }

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(
      'JSON corrupto en ' + label + ': ' + filePath,
      { cause: error }
    );
  }
}

export async function compareCatalogFiles({
  baselinePath,
  catalogPath
}) {
  const baseline = await readCatalogFile(baselinePath, 'el snapshot canónico');
  const catalog = await readCatalogFile(catalogPath, 'el catálogo generado');
  return {
    baseline,
    catalog,
    counts: countCatalog(catalog),
    differences: compareCatalogs(baseline, catalog)
  };
}

export async function updateCatalogBaseline({
  baselinePath,
  catalog,
  confirm = false
}) {
  if (!confirm) {
    throw new Error(
      'La actualización del baseline requiere confirmación explícita.'
    );
  }
  await writeOutputSafely(baselinePath, serializeCatalog(catalog));
  return {
    baselinePath: path.resolve(baselinePath),
    counts: countCatalog(catalog)
  };
}

