import {
  getRenderableCategories,
  productMatchesCategory
} from './catalogSelectors.js';
import { getProductTargetId } from '../utils/navigation.js';

export function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim()
    .replace(/\s+/g, ' ');
}

function getProductCategory(categories, product) {
  const matches = getRenderableCategories(categories)
    .filter((category) => productMatchesCategory(product, category))
    .sort((left, right) => {
      const leftSpecificity = Object.values(left.filter || {}).filter(Boolean).length;
      const rightSpecificity = Object.values(right.filter || {}).filter(Boolean).length;
      return rightSpecificity - leftSpecificity;
    });
  return matches[0] || null;
}

export function buildProductSearchIndex(products = [], categories = []) {
  return products
    .filter((product) => product?.enabled !== false && product?.id != null)
    .map((product, sourceIndex) => {
      const category = getProductCategory(categories, product);
      const variants = Array.isArray(product.variants) ? product.variants : [];
      const variantCodes = variants.map((variant) => variant.code).filter(Boolean);
      const variantNames = variants.map((variant) => variant.colorName).filter(Boolean);
      const fields = [
        product.name,
        product.id,
        product.code,
        ...variantCodes,
        product.category,
        product.subcategory,
        product.gender,
        category?.label,
        category?.title,
        ...variantNames
      ];

      return {
        productId: product.id,
        targetId: getProductTargetId(product.id),
        name: String(product.name || product.id),
        code: product.code || variantCodes[0] || '',
        categoryLabel: category?.label || category?.title || product.subcategory || product.category || '',
        order: product.order ?? sourceIndex,
        sourceIndex,
        normalizedName: normalizeSearchText(product.name),
        normalizedId: normalizeSearchText(product.id),
        searchText: normalizeSearchText(fields.filter(Boolean).join(' '))
      };
    });
}

export function searchProducts(index = [], query = '') {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  const terms = normalizedQuery.split(' ');
  return index
    .filter((entry) => terms.every((term) => entry.searchText.includes(term)))
    .map((entry) => {
      let relevance = 3;
      if (entry.normalizedName === normalizedQuery || entry.normalizedId === normalizedQuery) {
        relevance = 0;
      } else if (
        entry.normalizedName.startsWith(normalizedQuery) ||
        entry.normalizedId.startsWith(normalizedQuery)
      ) {
        relevance = 1;
      } else if (entry.normalizedName.includes(normalizedQuery)) {
        relevance = 2;
      }
      return { entry, relevance };
    })
    .sort((left, right) =>
      left.relevance - right.relevance ||
      left.entry.order - right.entry.order ||
      left.entry.sourceIndex - right.entry.sourceIndex ||
      left.entry.normalizedName.localeCompare(right.entry.normalizedName, 'es')
    )
    .map(({ entry }) => entry);
}

export function getNextSearchResultIndex(currentIndex, key, resultCount) {
  if (!Number.isInteger(resultCount) || resultCount < 1) return -1;
  if (key === 'ArrowDown') return (currentIndex + 1) % resultCount;
  if (key === 'ArrowUp') return currentIndex <= 0 ? resultCount - 1 : currentIndex - 1;
  return currentIndex;
}
