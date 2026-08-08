import { useEffect, useRef } from 'react';

function ThumbnailRail({ images, imageIndex, name, onSelect }) {
  const activeRef = useRef(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [imageIndex]);

  return (
    <div className="thumbs" aria-label={`Imágenes de ${name}`}>
      {images.map((image, index) => (
        <button
          className={`thumb ${index === imageIndex ? 'active' : ''}`}
          type="button"
          aria-label={`Ver imagen ${index + 1} de ${name}`}
          aria-pressed={index === imageIndex}
          key={`${image}-${index}`}
          onClick={() => onSelect(index)}
          ref={index === imageIndex ? activeRef : null}
        >
          <img src={image} alt="" />
        </button>
      ))}
    </div>
  );
}

export default ThumbnailRail;
