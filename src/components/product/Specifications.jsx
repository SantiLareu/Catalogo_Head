function Specifications({ contentId, expanded, onToggle, specifications }) {
  if (!Array.isArray(specifications) || specifications.length === 0) {
    return null;
  }

  return (
    <section className="product-specifications" aria-label="Ficha técnica">
      <button
        aria-controls={contentId}
        aria-expanded={expanded}
        className="product-specifications-toggle"
        onClick={onToggle}
        type="button"
      >
        <span>{expanded ? 'Ocultar ficha técnica' : 'Ver ficha técnica'}</span>
        <span aria-hidden="true">{expanded ? '−' : '+'}</span>
      </button>

      {expanded ? (
        <div
          aria-label="Contenido de la ficha técnica"
          className="product-specifications-content"
          id={contentId}
          role="region"
        >
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
                  {specification.values.map((value, index) => (
                    <li key={`${specification.id}-${value}-${index}`}>{value}</li>
                  ))}
                </ul>
              ) : (
                <span>{specification.values[0]}</span>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default Specifications;
