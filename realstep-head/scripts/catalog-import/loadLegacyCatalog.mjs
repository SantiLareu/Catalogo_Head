import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const LEGACY_DATA_FILES = [
  'js/data/calzado.js',
  'js/data/paletas.js',
  'js/data/pelotas.js',
  'js/data/bolsos.js',
  'js/data/indumentariaHombre.js',
  'js/data/indumentariaDama.js',
  'js/data/indumentaria.js',
  'js/data/accesorios/medias.js',
  'js/data/accesorios/antivibradores.js',
  'js/data/accesorios/cubreGrips.js',
  'js/data/accesorios/munequeras.js',
  'js/data/accesorios/grips.js',
  'js/data/accesorios/cuerdasTenis.js',
  'js/data/accesorios/gorras.js',
  'js/data/accesorios/accesorios.js',
  'js/data/products.js',
  'js/data/categories.js'
];

export async function loadLegacyCatalog(repoRoot) {
  const context = {
    console
  };

  context.window = context;
  vm.createContext(context);

  for (const relativeFile of LEGACY_DATA_FILES) {
    const absoluteFile = path.join(repoRoot, relativeFile);
    const source = await fs.readFile(absoluteFile, 'utf8');

    vm.runInContext(source, context, {
      filename: relativeFile
    });
  }

  const realStep = context.RealStep;
  const menIds = new Set(
    (realStep.indumentariaHombre || []).map(function(product) {
      return product.id;
    })
  );
  const womenIds = new Set(
    (realStep.indumentariaDama || []).map(function(product) {
      return product.id;
    })
  );

  return {
    realStep,
    products: realStep.products,
    categories: realStep.categories,
    genderByProductId: new Map(
      realStep.products
        .filter(function(product) {
          return menIds.has(product.id) || womenIds.has(product.id);
        })
        .map(function(product) {
          return [
            product.id,
            menIds.has(product.id) ? 'hombre' : 'dama'
          ];
        })
    )
  };
}

export function flattenLegacyCategories(categories) {
  const rows = [];

  categories.forEach(function(category, categoryIndex) {
    rows.push({
      category,
      parentId: null,
      order: categoryIndex
    });

    (category.children || []).forEach(function(child, childIndex) {
      rows.push({
        category: child,
        parentId: category.id,
        order: childIndex
      });
    });
  });

  return rows;
}

export function categoryFilterForLegacyEntry(entry) {
  const item = entry.category;
  const parentId = entry.parentId;
  let productCategory = item.productCategory || '';
  let productSubcategory = '';
  let gender = '';

  if (parentId === 'indumentaria') {
    productCategory = 'indumentaria';
    gender = item.id === 'indumentaria-hombre'
      ? 'hombre'
      : 'dama';
  }

  if (parentId === 'accesorios') {
    productCategory = 'accesorios';
    const subcategoryById = {
      'accesorios-medias': 'medias',
      'accesorios-antivibrador': 'antivibrador',
      'accesorios-cubre-grips': 'cubre-grips',
      'accesorios-munequeras': 'munequeras',
      'accesorios-grips': 'grips',
      'accesorios-cuerdas-tenis': 'cuerdas-tenis',
      'accesorios-gorras': 'gorras'
    };

    productSubcategory = subcategoryById[item.id] || '';
  }

  return {
    productCategory,
    productSubcategory,
    gender
  };
}
