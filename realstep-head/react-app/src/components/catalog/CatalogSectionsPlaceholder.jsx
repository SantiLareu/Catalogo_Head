function getRenderableCategories(categories) {
  return categories.flatMap((category) => {
    if (category.enabled === false) {
      return [];
    }

    const children = Array.isArray(category.children) ? category.children : [];

    if (children.length > 0) {
      return children.filter((child) => child.enabled !== false);
    }

    return [category];
  });
}

function CatalogSectionsPlaceholder({ categories }) {
  const renderableCategories = getRenderableCategories(categories);

  return (
    <div id="catalog-sections">
      {renderableCategories.map((category) => (
        <section
          className="catalog-placeholder"
          id={category.target}
          data-catalog-category={category.id}
          key={category.id}
          tabIndex="-1"
        >
          <div className="heading">
            <p className="ey">COLECCIÓN</p>
            <h2>{category.title}</h2>
            {category.subtitle ? <p>{category.subtitle}</p> : null}
          </div>
          <div className="list">
            <div className="empty">
              <strong>Migración en progreso</strong>
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}

export default CatalogSectionsPlaceholder;
