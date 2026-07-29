import { useCallback, useEffect, useRef } from 'react';
import CategoryIndex from './CategoryIndex.jsx';
import useBodyScrollLock from '../../hooks/useBodyScrollLock.js';
import useFocusTrap from '../../hooks/useFocusTrap.js';

function MenuIcon() {
  return (
    <span className="menu-icon" aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

function CategoryMenu({ categories, onClose, openerRef }) {
  const menuRef = useRef(null);
  const closeRef = useRef(null);
  const close = useCallback(() => onClose(), [onClose]);

  useBodyScrollLock(true, { inertRoot: false });
  useFocusTrap(menuRef, true, close);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    return () => openerRef.current?.focus({ preventScroll: true });
  }, [openerRef]);

  return (
    <div
      className="category-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menú de categorías"
      ref={menuRef}
      tabIndex="-1"
    >
      <button
        className="category-menu-overlay"
        type="button"
        aria-label="Cerrar menú de categorías"
        tabIndex="-1"
        onClick={close}
      />
      <aside className="category-menu-panel" id="header-category-menu">
        <div className="category-menu-heading">
          <p>CATEGORÍAS</p>
          <button
            className="menu-toggle menu-toggle--close"
            type="button"
            aria-label="Cerrar menú de categorías"
            aria-expanded="true"
            aria-controls="header-category-menu"
            onClick={close}
            ref={closeRef}
          >
            <MenuIcon />
          </button>
        </div>
        <CategoryIndex
          categories={categories}
          id="header-category-index"
          idPrefix="header-menu"
          onNavigate={close}
          variant="menu"
        />
      </aside>
    </div>
  );
}

export { MenuIcon };
export default CategoryMenu;
