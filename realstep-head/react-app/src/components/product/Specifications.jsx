function Specifications({ specifications }) {
  if (!Array.isArray(specifications) || specifications.length === 0) {
    return null;
  }

  return (
    <section className="product-specifications" aria-label="Ficha técnica">
      <h3>Ficha técnica</h3>

      {specifications.map((specification) => (
        <div
          className={`specification-row ${
            specification.values.length > 1 ? 'specification-features' : ''
          }`}
          key={specification.id}
        >
          <strong>{specification.label}</strong>
          {specification.values.length > 1 ? (
            <ul>
              {specification.values.map((value) => (
                <li key={value}>{value}</li>
              ))}
            </ul>
          ) : (
            <span>{specification.values[0]}</span>
          )}
        </div>
      ))}
    </section>
  );
}

export default Specifications;
