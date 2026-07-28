import ProductCard from '../product/ProductCard.jsx';

function CatalogSection({ category, categories, products }) {
  return (
    <section
      className="catalog-section"
      id={category.target}
      data-catalog-category={category.id}
      data-product-count={products.length}
      tabIndex="-1"
    >
      <div className="heading">
        <p className="ey">COLECCIÓN</p>
        <h2>{category.title}</h2>
        {category.subtitle ? <p>{category.subtitle}</p> : null}
      </div>

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
