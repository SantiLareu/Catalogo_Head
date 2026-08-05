import { useMemo } from 'react';
import { getCategoryEditorialCover } from '../../config/categoryEditorialCovers.js';
import { buildCatalogSections } from '../../data/catalogSelectors.js';
import CatalogSection from './CatalogSection.jsx';

function CatalogSections({ categories, products }) {
  const sections = useMemo(
    () => buildCatalogSections(categories, products),
    [categories, products]
  );

  return (
    <div id="catalog-sections">
      {sections.map(({ category, products: sectionProducts }) => (
        <CatalogSection
          category={category}
          categories={categories}
          editorialCover={getCategoryEditorialCover(category.id)}
          key={category.id}
          products={sectionProducts}
        />
      ))}
    </div>
  );
}

export default CatalogSections;
