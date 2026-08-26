import { useEffect, useRef } from 'react';

function ThumbnailRail({ images, imageIndex, name, onSelect }) {
  const activeRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const active = activeRef.current;
    if (!container || !active) return;

    // Centrar el thumbnail activo dentro del contenedor horizontal
    // manipulando ÚNICAMENTE container.scrollLeft.
    // Nunca usamos APIs que desplacen la ventana raíz: pueden arrastrar
    // window.scrollY cuando el thumb activo está fuera del viewport.
    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const desiredScrollLeft =
      container.scrollLeft +
      (activeRect.left - containerRect.left) -
      containerRect.width / 2 +
      activeRect.width / 2;

    if (desiredScrollLeft !== container.scrollLeft) {
      container.scrollLeft = desiredScrollLeft;
    }
  }, [imageIndex]);

  return (
    <div className="thumbs" aria-label={`Imágenes de ${name}`} ref={containerRef}>
      {images.map((image, index) => (
        <button
          className={`thumb ${index === imageIndex ? 'active' : ''}`}
          type="button"
          aria-label={`Ver imagen ${index + 1} de ${name}`}
          aria-pressed={index === imageIndex}
          key={`${image.original}-${index}`}
          onClick={() => onSelect(index)}
          ref={index === imageIndex ? activeRef : null}
        >
          <img src={image.thumbnail} alt="" loading="lazy" decoding="async" />
        </button>
      ))}
    </div>
  );
}

export default ThumbnailRail;
