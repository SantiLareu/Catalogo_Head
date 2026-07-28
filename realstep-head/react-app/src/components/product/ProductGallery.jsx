import ThumbnailRail from './ThumbnailRail.jsx';

function ProductGallery({
  images,
  imageIndex,
  name,
  onNext,
  onOpen,
  onPrevious,
  onSelect,
  openerRef
}) {
  const hasMultipleImages = images.length > 1;

  const handleKeyDown = (event) => {
    if (event.currentTarget !== event.target) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      onPrevious();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      onNext();
    }
  };

  return (
    <div
      className="gallery"
      tabIndex="0"
      aria-label={`Galería de imágenes de ${name}`}
      onKeyDown={handleKeyDown}
    >
      <div className="mainimg">
        {images.length > 0 ? (
          <button
            className="mainimg-open"
            type="button"
            aria-label={`Ampliar imagen de ${name}`}
            data-image-index={imageIndex}
            onClick={onOpen}
            ref={openerRef}
          >
            <img src={images[imageIndex]} alt={`${name} imagen ${imageIndex + 1}`} />
          </button>
        ) : null}
        {hasMultipleImages ? (
          <>
            <button
              className="gallery-nav gallery-nav--previous"
              type="button"
              aria-label={`Ver imagen anterior de ${name}`}
              onClick={onPrevious}
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              className="gallery-nav gallery-nav--next"
              type="button"
              aria-label={`Ver imagen siguiente de ${name}`}
              onClick={onNext}
            >
              <span aria-hidden="true">›</span>
            </button>
          </>
        ) : null}
      </div>
      <ThumbnailRail
        images={images}
        imageIndex={imageIndex}
        name={name}
        onSelect={onSelect}
      />
    </div>
  );
}

export default ProductGallery;
