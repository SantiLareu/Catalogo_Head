import CategoryEditorialCover from './CategoryEditorialCover.jsx';
import ProductCard from '../product/ProductCard.jsx';

function CategoryHeading({ category }) {
  return (
    <div className="heading">
      <p className="ey">COLECCIÓN</p>
      <h2>{category.title}</h2>
      {category.subtitle ? <p>{category.subtitle}</p> : null}
    </div>
  );
}

function CatalogSection({ category, categories, editorialCover, products }) {
  const replacesHeading = editorialCover?.mode === 'replace';

  return (
    <section
      className="catalog-section"
      id={category.target}
      data-catalog-category={category.id}
      data-product-count={products.length}
      tabIndex="-1"
    >
      {editorialCover ? <CategoryEditorialCover {...editorialCover} /> : null}
      {replacesHeading ? null : <CategoryHeading category={category} />}

      <div className="list">
        {products.length > 0 ? (
          products.map((product) => (
            <ProductCard categories={categories} key={product.id} product={product} />
          ))
        ) : (
          <div className="empty">
            <strong>Próximamente</strong>
          </div>
        )}
      </div>
    </section>
  );
}

export default CatalogSection;
