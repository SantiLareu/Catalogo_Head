// Exportación del catálogo a Excel (.xlsx).
//
// Módulo puro y testeable: transforma el catálogo activo
// (`generated/catalog.json` o la representación equivalente que ya consume
// React) en filas planas de seis columnas. No importa librerías de Excel ni
// React para poder probarse con `node --test`.
//
// Modelo real del catálogo (ver scripts/catalog-import/buildCatalog.mjs):
// - Producto: { id, category, subcategory|null, gender|null, name, code,
//   price, enabled, stockMode, order, images, sizes[], specifications,
//   variants[] }.
// - Variante (= color): { id, code, colorName, price|null, order, images,
//   sizes[] }. No tiene flag de habilitación propio.
// - Los talles viven en UN solo nivel: en `variant.sizes` cuando el producto
//   tiene variantes, o en `product.sizes` cuando no las tiene. Nunca en ambos.
// - `variant.price` es opcional; cuando es null rige `product.price`
//   (ver getEffectivePrice en src/data/catalogSelectors.js).
// - Cada entrada de talle es { size, stock, inStock, order }. El stock NO se
//   exporta ni se usa para filtrar (stockIsAvailabilityOnly: solo indica
//   disponibilidad y el Excel es el maestro de productos, no una foto del
//   inventario).

export const EXPORT_SHEET_NAME = 'Productos';

export const EXPORT_HEADERS = [
  'Artículo',
  'Color',
  'Talle',
  'Categoría',
  'Subcategoría',
  'Precio'
];

export const EXPORT_SCOPES = {
  ALL: 'all',
  CATEGORY: 'category',
  SUBCATEGORY: 'subcategory'
};

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function compareByOrder(left, right) {
  const orderDifference = (left.order ?? 0) - (right.order ?? 0);
  return (
    orderDifference ||
    String(left.id ?? left.value ?? '').localeCompare(
      String(right.id ?? right.value ?? ''),
      'es'
    )
  );
}

function findTopCategory(categories, categoryValue) {
  return (
    asArray(categories).find(
      (category) =>
        category?.filter?.category === categoryValue ||
        category?.productCategory === categoryValue ||
        category?.id === categoryValue
    ) || null
  );
}

// Etiqueta visible de una categoría, resuelta dinámicamente desde el árbol de
// categorías del catálogo. Si no hay coincidencia se usa el valor crudo para
// no perder información ante datos legacy.
export function resolveCategoryLabel(categories, categoryValue) {
  if (categoryValue == null || String(categoryValue).trim() === '') return '';
  const top = findTopCategory(categories, categoryValue);
  if (top && typeof top.label === 'string' && top.label.trim() !== '') {
    return top.label;
  }
  return String(categoryValue);
}

// Etiqueta visible de una subcategoría dentro de su categoría padre.
export function resolveSubcategoryLabel(categories, categoryValue, subcategoryValue) {
  if (subcategoryValue == null || String(subcategoryValue).trim() === '') {
    return '';
  }
  const top = findTopCategory(categories, categoryValue);
  const child = asArray(top?.children).find(
    (candidate) => candidate?.filter?.subcategory === subcategoryValue
  );
  if (child && typeof child.label === 'string' && child.label.trim() !== '') {
    return child.label;
  }
  return String(subcategoryValue);
}

// Un producto está publicado cuando está habilitado y su categoría de nivel
// superior no está deshabilitada. Los hijos deshabilitados con filtro de
// subcategoría también ocultan sus productos (misma visibilidad que las
// secciones del catálogo). Los hijos con filtro sólo por género nunca
// excluyen: el filtro de exportación es categoría/subcategoría, no género.
export function isProductPublished(product, categories) {
  if (!product || product.enabled === false) return false;
  const tops = asArray(categories);
  if (tops.length === 0) return true;
  const top = findTopCategory(categories, product.category);
  if (top && top.enabled === false) return false;
  if (product.subcategory != null && top) {
    const disabledChild = asArray(top.children).find(
      (child) =>
        child?.enabled === false &&
        child?.filter?.subcategory != null &&
        child.filter.subcategory === product.subcategory
    );
    if (disabledChild) return false;
  }
  return true;
}

// Categorías con al menos un producto publicado, derivadas de los datos
// actuales (nunca hardcodeadas). Agregar, eliminar o renombrar una categoría
// mediante products.xlsx + importador se refleja automáticamente.
export function getExportCategories(catalog) {
  const categories = asArray(catalog?.categories);
  const products = asArray(catalog?.products);
  const seen = new Map();

  products.forEach((product) => {
    if (!isProductPublished(product, categories)) return;
    if (product.category == null) return;
    if (!seen.has(product.category)) {
      const top = findTopCategory(categories, product.category);
      seen.set(product.category, {
        value: product.category,
        label: resolveCategoryLabel(categories, product.category),
        order: top?.order ?? 0
      });
    }
  });

  return [...seen.values()].sort(compareByOrder);
}

// Subcategorías con al menos un producto publicado dentro de la categoría
// indicada. Solo muestra subcategorías de esa categoría.
export function getExportSubcategories(catalog, categoryValue) {
  const categories = asArray(catalog?.categories);
  const products = asArray(catalog?.products);
  if (categoryValue == null) return [];
  const seen = new Map();

  products.forEach((product) => {
    if (product.category !== categoryValue) return;
    if (!isProductPublished(product, categories)) return;
    if (product.subcategory == null) return;
    if (!seen.has(product.subcategory)) {
      const top = findTopCategory(categories, categoryValue);
      const child = asArray(top?.children).find(
        (candidate) => candidate?.filter?.subcategory === product.subcategory
      );
      seen.set(product.subcategory, {
        value: product.subcategory,
        label: resolveSubcategoryLabel(
          categories,
          categoryValue,
          product.subcategory
        ),
        order: child?.order ?? 0
      });
    }
  });

  return [...seen.values()].sort(compareByOrder);
}

function matchesSelection(product, selection) {
  if (!selection || selection.scope === EXPORT_SCOPES.ALL) return true;
  if (product.category !== selection.category) return false;
  if (selection.scope === EXPORT_SCOPES.SUBCATEGORY) {
    return product.subcategory === selection.subcategory;
  }
  return true;
}

// Productos publicados (habilitados y visibles) que entran en el alcance.
// La estructura resultante es siempre la misma, solo cambia el subconjunto.
export function filterExportProducts(catalog, selection) {
  const categories = asArray(catalog?.categories);
  return asArray(catalog?.products).filter(
    (product) =>
      isProductPublished(product, categories) &&
      matchesSelection(product, selection)
  );
}

function resolvePrice(product, variant) {
  const price = variant?.price ?? product?.price;
  if (typeof price === 'number' && Number.isFinite(price)) return price;
  const coerced = Number(price);
  return Number.isFinite(coerced) ? coerced : 0;
}

// Una fila por cada combinación válida Artículo + Color + Talle:
// - Con variantes (= colores): una fila por variante × talle de esa variante.
//   Si una variante no tiene talles, aporta una fila con Talle vacío.
// - Sin variantes: una fila por talle de `product.sizes`; si no hay talles,
//   una única fila con Color y Talle vacíos.
// - El stock nunca decide qué filas existen: las combinaciones con stock 0 se
//   incluyen igual (aquí ni siquiera se lee `stock`/`inStock`).
// - Celdas sin dato quedan como cadena vacía (nunca "-", "N/A", etc.).
// Orden reservado para valores sin posición en el árbol del catálogo.
// Solo afecta datos huérfanos o legacy: el importador exige `orden` válido.
const UNKNOWN_ORDER = Number.MAX_SAFE_INTEGER;

function compareExportText(left, right) {
  return String(left ?? '').localeCompare(String(right ?? ''), 'es');
}

function categoryOrderFor(categories, categoryValue) {
  return findTopCategory(categories, categoryValue)?.order ?? UNKNOWN_ORDER;
}

function subcategoryOrderFor(categories, categoryValue, subcategoryValue) {
  if (subcategoryValue == null) return -1;
  const top = findTopCategory(categories, categoryValue);
  const child = asArray(top?.children).find(
    (candidate) => candidate?.filter?.subcategory === subcategoryValue
  );
  return child?.order ?? UNKNOWN_ORDER;
}

// Orden de exportación (solo al preparar las filas, sin tocar el orden
// visual del catálogo): orden de la categoría en el árbol, orden de la
// subcategoría dentro de su padre, artículo y color alfabéticos, y talle
// según su `order` real en el catálogo (orden natural: S<M<L<XL, 7<8<9…).
// Los empates se dirimen por etiqueta, precio y posición de origen para que
// el resultado sea siempre determinista.
function compareExportEntries(categories, left, right) {
  const categoryOrder =
    categoryOrderFor(categories, left.categoryValue) -
    categoryOrderFor(categories, right.categoryValue);
  if (categoryOrder !== 0) return categoryOrder;

  const categoryLabel = compareExportText(left.row.categoria, right.row.categoria);
  if (categoryLabel !== 0) return categoryLabel;

  const subcategoryOrder =
    subcategoryOrderFor(categories, left.categoryValue, left.subcategoryValue) -
    subcategoryOrderFor(categories, right.categoryValue, right.subcategoryValue);
  if (subcategoryOrder !== 0) return subcategoryOrder;

  const subcategoryLabel = compareExportText(left.row.subcategoria, right.row.subcategoria);
  if (subcategoryLabel !== 0) return subcategoryLabel;

  const article = compareExportText(left.row.articulo, right.row.articulo);
  if (article !== 0) return article;

  const color = compareExportText(left.row.color, right.row.color);
  if (color !== 0) return color;

  if (left.sizeOrder !== right.sizeOrder) return left.sizeOrder - right.sizeOrder;

  const sizeLabel = String(left.row.talle ?? '').localeCompare(
    String(right.row.talle ?? ''),
    'es',
    { numeric: true }
  );
  if (sizeLabel !== 0) return sizeLabel;

  if (left.row.precio !== right.row.precio) {
    return left.row.precio - right.row.precio;
  }
  return left.sequence - right.sequence;
}

// Deduplicación y orden de las filas:
// - Las filas idénticas se deduplican conservando la primera aparición.
// - Las filas se ordenan por categoría, subcategoría, artículo, color y
//   talle según compareExportEntries. Vale para catálogo completo,
//   categoría y subcategoría porque el orden se aplica después de filtrar.
export function buildExportRows(products, categories) {
  const list = asArray(products);
  const entries = [];
  const seen = new Set();
  let sequence = 0;

  list.forEach((product) => {
    if (!product || product.enabled === false) return;
    const variants = asArray(product.variants);
    const colors = variants.length > 0 ? variants : [null];

    colors.forEach((variant) => {
      const variantSizes = asArray(variant?.sizes);
      const ownSizes =
        variants.length > 0 ? variantSizes : asArray(product.sizes);
      const sizes = ownSizes.length > 0 ? ownSizes : [null];

      sizes.forEach((sizeEntry) => {
        const row = {
          articulo: product.name ?? '',
          color: variant?.colorName ?? '',
          talle:
            typeof sizeEntry === 'string'
              ? sizeEntry
              : (sizeEntry?.size ?? ''),
          categoria: resolveCategoryLabel(categories, product.category),
          subcategoria: resolveSubcategoryLabel(
            categories,
            product.category,
            product.subcategory
          ),
          precio: resolvePrice(product, variant)
        };

        const key = [
          row.articulo,
          row.color,
          row.talle,
          row.categoria,
          row.subcategoria,
          row.precio
        ].join('\u0000');
        if (seen.has(key)) return;
        seen.add(key);
        entries.push({
          row,
          categoryValue: product.category,
          subcategoryValue: product.subcategory,
          sizeOrder: typeof sizeEntry?.order === 'number' ? sizeEntry.order : 0,
          sequence: sequence++
        });
      });
    });
  });

  entries.sort((left, right) => compareExportEntries(categories, left, right));
  return entries.map((entry) => entry.row);
}

// Tabla lista para escribirse como hoja "Productos": encabezados + matriz de
// valores en el orden exacto Artículo, Color, Talle, Categoría, Subcategoría,
// Precio. Precio viaja como número real (sin símbolos ni formato) para que
// los sistemas externos lo procesen. Sin hojas, títulos, logos, imágenes ni
// columnas auxiliares: solo estas seis columnas.
export function buildExportTable(catalog, selection) {
  const categories = asArray(catalog?.categories);
  const products = filterExportProducts(catalog, selection);
  const rows = buildExportRows(products, categories);
  return {
    sheetName: EXPORT_SHEET_NAME,
    headers: [...EXPORT_HEADERS],
    rows: rows.map((row) => [
      row.articulo,
      row.color,
      row.talle,
      row.categoria,
      row.subcategoria,
      row.precio
    ])
  };
}

export function slugifyExportFragment(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// Prefijo del archivo derivado de la configuración comercial
// ("HEAD Mayorista" → "catalogo-head"). Si el nombre no aporta nada útil se
// usa "catalogo" para mantener un nombre siempre seguro.
export function resolveExportFilePrefix(catalogName) {
  const firstWord = String(catalogName ?? '').trim().split(/\s+/)[0] ?? '';
  const fragment = slugifyExportFragment(firstWord);
  return fragment ? `catalogo-${fragment}` : 'catalogo';
}

function formatExportDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// catalogo-head-completo-2026-09-16.xlsx,
// catalogo-head-calzado-2026-09-16.xlsx,
// catalogo-head-medias-2026-09-16.xlsx
export function buildExportFileName(selection, options = {}) {
  const prefix = options.prefix ?? resolveExportFilePrefix(options.catalogName);
  const date = formatExportDate(options.now ?? new Date());
  let fragment = 'completo';

  if (selection?.scope === EXPORT_SCOPES.SUBCATEGORY && selection.subcategory != null) {
    fragment = slugifyExportFragment(selection.subcategory) || 'completo';
  } else if (selection?.scope === EXPORT_SCOPES.CATEGORY && selection.category != null) {
    fragment = slugifyExportFragment(selection.category) || 'completo';
  }

  return `${prefix}-${fragment}-${date}.xlsx`;
}
