import catalog from './data/catalog.js';

function countCategories(categories) {
  return categories.reduce(
    (total, category) =>
      total + 1 + countCategories(Array.isArray(category.children) ? category.children : []),
    0
  );
}

function App() {
  const products = Array.isArray(catalog.products) ? catalog.products : [];
  const categories = Array.isArray(catalog.categories) ? catalog.categories : [];
  const variantCount = products.reduce(
    (total, product) =>
      total + (Array.isArray(product.variants) ? product.variants.length : 0),
    0
  );
  const activeCategories = categories.filter((category) => category.enabled);
  const availabilityOnly = catalog.stockIsAvailabilityOnly === true;

  return (
    <main className="react-shell">
      <section className="react-shell__panel" aria-labelledby="react-shell-title">
        <p className="react-shell__eyebrow">BASE TÉCNICA · ETAPA 2</p>
        <h1 id="react-shell-title">Real Step · Catálogo React</h1>
        <p className="react-shell__intro">
          La shell de React importó correctamente el catálogo consolidado generado desde Excel.
        </p>

        <dl className="react-shell__metrics" aria-label="Resumen del catálogo">
          <div>
            <dt>Productos</dt>
            <dd data-testid="product-count">{products.length}</dd>
          </div>
          <div>
            <dt>Variantes</dt>
            <dd data-testid="variant-count">{variantCount}</dd>
          </div>
          <div>
            <dt>Categorías configuradas</dt>
            <dd data-testid="category-count">{countCategories(categories)}</dd>
          </div>
        </dl>

        <section className="react-shell__categories" aria-labelledby="active-categories-title">
          <h2 id="active-categories-title">Categorías activas</h2>
          {activeCategories.length > 0 ? (
            <ul data-testid="active-categories">
              {activeCategories.map((category) => (
                <li key={category.id}>{category.label}</li>
              ))}
            </ul>
          ) : (
            <p>No hay categorías activas.</p>
          )}
        </section>

        <p
          className={`react-shell__status ${
            availabilityOnly ? 'react-shell__status--ok' : 'react-shell__status--warning'
          }`}
          role="status"
          data-testid="availability-status"
        >
          {availabilityOnly
            ? 'Stock en modo disponibilidad: activo'
            : 'Stock en modo disponibilidad: inactivo'}
        </p>
      </section>
    </main>
  );
}

export default App;
