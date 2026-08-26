import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import useBodyScrollLock from '../../hooks/useBodyScrollLock.js';
import useFocusTrap from '../../hooks/useFocusTrap.js';

function Lightbox({ imageIndex, images, name, onClose, onNext, onPrevious, originRef }) {
  const rootRef = useRef(null);
  const closeRef = useRef(null);
  const imageRef = useRef(null);
  const viewportRef = useRef(null);
  const gestureRef = useRef({
    zoom: 1,
    panX: 0,
    panY: 0,
    pointers: new Map(),
    starts: new Map(),
    pinchDistance: 0,
    pinchZoom: 1,
    lastTap: 0,
    lastTouchZoom: 0
  });

  const applyTransform = useCallback(() => {
    const gesture = gestureRef.current;
    const viewport = viewportRef.current;
    const image = imageRef.current;
    if (!viewport || !image) return;
    const limitX = (viewport.clientWidth * (gesture.zoom - 1)) / 2;
    const limitY = (viewport.clientHeight * (gesture.zoom - 1)) / 2;
    gesture.panX = Math.max(-limitX, Math.min(limitX, gesture.panX));
    gesture.panY = Math.max(-limitY, Math.min(limitY, gesture.panY));
    image.style.transform = `translate3d(${gesture.panX}px,${gesture.panY}px,0) scale(${gesture.zoom})`;
    image.classList.toggle('zoomed', gesture.zoom > 1);
  }, []);

  const setZoom = useCallback((zoom) => {
    const gesture = gestureRef.current;
    gesture.zoom = Math.max(1, Math.min(4, zoom));
    if (gesture.zoom === 1) {
      gesture.panX = 0;
      gesture.panY = 0;
    }
    applyTransform();
  }, [applyTransform]);

  const resetTransform = useCallback(() => {
    const gesture = gestureRef.current;
    gesture.zoom = 1;
    gesture.panX = 0;
    gesture.panY = 0;
    gesture.pointers.clear();
    gesture.starts.clear();
    applyTransform();
  }, [applyTransform]);

  const toggleZoom = useCallback(() => {
    setZoom(gestureRef.current.zoom > 1 ? 1 : 2.5);
  }, [setZoom]);

  const close = useCallback(() => {
    resetTransform();
    onClose();
  }, [onClose, resetTransform]);

  useBodyScrollLock(true);
  useFocusTrap(rootRef, true, close);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => originRef.current?.focus({ preventScroll: true });
  }, [originRef]);

  useEffect(() => {
    resetTransform();
  }, [imageIndex, resetTransform]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        onNext();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNext, onPrevious]);

  const pointerDistance = () => {
    const points = [...gestureRef.current.pointers.values()];
    if (points.length < 2) return 0;
    return Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  };

  const handlePointerDown = (event) => {
    if (event.target !== imageRef.current) return;
    const gesture = gestureRef.current;
    gesture.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gesture.starts.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
      time: Date.now(),
      pointerType: event.pointerType
    });
    if (gesture.pointers.size === 2) {
      gesture.pinchDistance = pointerDistance();
      gesture.pinchZoom = gesture.zoom;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    imageRef.current.classList.add('dragging');
    event.preventDefault();
  };

  const handlePointerMove = (event) => {
    const gesture = gestureRef.current;
    const pointer = gesture.pointers.get(event.pointerId);
    if (!pointer) return;
    const previous = { ...pointer };
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (gesture.pointers.size >= 2 && gesture.pinchDistance) {
      setZoom((gesture.pinchZoom * pointerDistance()) / gesture.pinchDistance);
    } else if (gesture.zoom > 1) {
      gesture.panX += pointer.x - previous.x;
      gesture.panY += pointer.y - previous.y;
      applyTransform();
    }
    event.preventDefault();
  };

  const handlePointerEnd = (event) => {
    const gesture = gestureRef.current;
    const start = gesture.starts.get(event.pointerId);
    const pointer = gesture.pointers.get(event.pointerId);
    const touchTap =
      start?.pointerType === 'touch' &&
      pointer &&
      Date.now() - start.time < 320 &&
      Math.abs(pointer.x - start.x) < 12 &&
      Math.abs(pointer.y - start.y) < 12;
    gesture.pointers.delete(event.pointerId);
    gesture.starts.delete(event.pointerId);
    if (gesture.pointers.size < 2) gesture.pinchDistance = 0;
    imageRef.current?.classList.remove('dragging');
    if (touchTap) {
      const now = Date.now();
      if (now - gesture.lastTap < 320) {
        toggleZoom();
        gesture.lastTouchZoom = now;
        gesture.lastTap = 0;
      } else {
        gesture.lastTap = now;
      }
    }
  };

  const handleWheel = useCallback((event) => {
    event.preventDefault();
    setZoom(gestureRef.current.zoom * Math.exp(-event.deltaY * 0.0015));
  }, [setZoom]);

  useEffect(() => {
    const root = rootRef.current;
    root?.addEventListener('wheel', handleWheel, { passive: false });
    return () => root?.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleDoubleClick = (event) => {
    if (
      event.target === imageRef.current &&
      Date.now() - gestureRef.current.lastTouchZoom > 500
    ) {
      event.preventDefault();
      toggleZoom();
    }
  };

  return createPortal(
    <div
      className="lightbox open"
      role="dialog"
      aria-modal="true"
      aria-label={`Vista ampliada de ${name}`}
      ref={rootRef}
      tabIndex="-1"
      onDoubleClick={handleDoubleClick}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
    >
      <div className="lightbox-stage" onClick={(event) => event.target === event.currentTarget && close()}>
        <button
          className="lightbox-close"
          type="button"
          aria-label="Cerrar imagen ampliada"
          onClick={close}
          ref={closeRef}
        >×</button>
        {images.length > 1 ? (
          <button
            className="lightbox-nav lightbox-nav--previous"
            type="button"
            aria-label="Ver imagen anterior"
            onClick={onPrevious}
          ><span aria-hidden="true">‹</span></button>
        ) : null}
        <div
          className="lightbox-viewport"
          onClick={(event) => event.target === event.currentTarget && close()}
          ref={viewportRef}
        >
          <img
            decoding="async"
            className="lightbox-image"
            src={images[imageIndex].original}
            alt={`${name} imagen ${imageIndex + 1}`}
            draggable="false"
            ref={imageRef}
          />
        </div>
        {images.length > 1 ? (
          <button
            className="lightbox-nav lightbox-nav--next"
            type="button"
            aria-label="Ver imagen siguiente"
            onClick={onNext}
          ><span aria-hidden="true">›</span></button>
        ) : null}
        <div className="lightbox-counter" aria-live="polite">
          {imageIndex + 1} / {images.length}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Lightbox;
