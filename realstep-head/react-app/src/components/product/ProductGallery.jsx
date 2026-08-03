import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ThumbnailRail from './ThumbnailRail.jsx';

const CROSSFADE_TOTAL_MS = 220;

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
  const [previousSrc, setPreviousSrc] = useState(null);
  const previousImageIndexRef = useRef(imageIndex);
  const cleanupTimerRef = useRef(null);

  useLayoutEffect(() => {
    if (imageIndex === previousImageIndexRef.current) return;
    const prevIndex = previousImageIndexRef.current;
    const prevSrc = images[prevIndex];
    previousImageIndexRef.current = imageIndex;

    if (!prevSrc || prevSrc === images[imageIndex]) {
      setPreviousSrc(null);
      return;
    }
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
    }
    setPreviousSrc(prevSrc);
    cleanupTimerRef.current = window.setTimeout(() => {
      setPreviousSrc(null);
      cleanupTimerRef.current = null;
    }, CROSSFADE_TOTAL_MS);
  }, [imageIndex, images]);

  useEffect(() => () => {
    if (cleanupTimerRef.current) {
      clearTimeout(cleanupTimerRef.current);
      cleanupTimerRef.current = null;
    }
  }, []);

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
            <img
              key={imageIndex}
              src={images[imageIndex]}
              alt={`${name} imagen ${imageIndex + 1}`}
              className="gallery-image gallery-image--current"
            />
          </button>
        ) : null}
        {previousSrc ? (
          <img
            key={previousSrc}
            src={previousSrc}
            alt=""
            aria-hidden="true"
            className="gallery-image gallery-image--leaving"
          />
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
