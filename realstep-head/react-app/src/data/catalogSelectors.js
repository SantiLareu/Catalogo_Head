const specificationMetadata = {
  fit: { label: 'FIT', order: 0 },
  mainFabric: { label: 'MAIN FABRIC', order: 1 },
  secondFabric: { label: '2ND FABRIC', order: 2 },
  secondaryFabric: { label: '2ND FABRIC', order: 2 },
  thirdFabric: { label: 'THIRD FABRIC', order: 3 },
  features: { label: 'FEATURES', order: 4 }
};

function compareByOrder(left, right) {
  const orderDifference = (left.order ?? 0) - (right.order ?? 0);
  return orderDifference || String(left.id).localeCompare(String(right.id), 'es');
}

export function getRenderableCategories(categories = []) {
  return [...categories]
    .sort(compareByOrder)
    .flatMap((category) => {
      if (category.enabled === false) {
        return [];
      }

      const children = Array.isArray(category.children)
        ? [...category.children].sort(compareByOrder)
        : [];

      return children.length > 0
        ? children.filter((child) => child.enabled !== false)
        : [category];
    });
}

export function productMatchesCategory(product, category) {
  const filter = category.filter || {};

  return (
    product.enabled !== false &&
    (filter.category == null || product.category === filter.category) &&
    (filter.subcategory == null || product.subcategory === filter.subcategory) &&
    (filter.gender == null || product.gender === filter.gender)
  );
}

export function getProductsForCategory(products = [], category) {
  return products
    .filter((product) => productMatchesCategory(product, category))
    .sort(compareByOrder);
}

export function getFirstVariant(product) {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return variants.length > 0 ? [...variants].sort(compareByOrder)[0] : null;
}

export function getVariantById(product, variantId) {
  return (Array.isArray(product.variants) ? product.variants : []).find(
    (variant) => variant.id === variantId
  ) || null;
}

export function getEffectivePrice(product, variant = getFirstVariant(product)) {
  return variant?.price == null ? product.price : variant.price;
}

export function getEffectiveImages(product, variant = getFirstVariant(product)) {
  const images =
    variant && Array.isArray(variant.images) ? variant.images : product.images;
  return Array.isArray(images) ? images : [];
}

export function getPrimaryImagePath(product, variant = getFirstVariant(product)) {
  const images = getEffectiveImages(product, variant);
  return Array.isArray(images) && images.length > 0 ? images[0] : null;
}

export function getEffectiveCode(product, variant = getFirstVariant(product)) {
  return variant ? variant.code : product.code;
}

export function getEffectiveSizes(product, variant = getFirstVariant(product)) {
  const sizes =
    variant && Array.isArray(variant.sizes) ? variant.sizes : product.sizes;
  return Array.isArray(sizes)
    ? [...sizes].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    : [];
}

export function normalizeSpecifications(specifications) {
  if (!specifications || typeof specifications !== 'object') {
    return [];
  }

  return Object.entries(specifications)
    .flatMap(([key, rawValue], sourceIndex) => {
      const values = (Array.isArray(rawValue) ? rawValue : [rawValue]).filter(
        (value) => value != null && String(value).trim() !== ''
      );

      if (values.length === 0) {
        return [];
      }

      const metadata = specificationMetadata[key] || {
        label: key.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase(),
        order: 100 + sourceIndex
      };

      return [
        {
          id: key,
          label: metadata.label,
          values,
          order: metadata.order
        }
      ];
    })
    .sort((left, right) => left.order - right.order);
}

export function getCategoryLabel(categories = [], product) {
  const category = categories.find(
    (candidate) => candidate.filter?.category === product.category
  );

  return category?.label || String(product.category || '').toUpperCase();
}

export function buildCatalogSections(categories = [], products = []) {
  return getRenderableCategories(categories).map((category) => ({
    category,
    products: getProductsForCategory(products, category)
  }));
}
