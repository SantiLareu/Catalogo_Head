import CategoryLink from './CategoryLink.jsx';

function CategoryGroup({ category, idPrefix, isOpen, onNavigate, onToggle, showParentLink = false }) {
  const submenuId = `${idPrefix}-category-submenu-${category.id}`;
  const children = Array.isArray(category.children) ? category.children : [];
  const parentLinkVisible = showParentLink && category.enabled !== false;

  return (
    <div className="category-index-group">
      <button
        type="button"
        className="category-index-item category-index-toggle enabled"
        aria-expanded={isOpen}
        aria-controls={submenuId}
        onClick={() => onToggle(category.id)}
      >
        <span>{category.label}</span>
        <span className="category-index-arrow" aria-hidden="true">
          ›
        </span>
      </button>

      <div
        className={`category-index-submenu ${isOpen ? 'open' : ''}`}
        id={submenuId}
        style={{ '--category-submenu-count': children.length + (parentLinkVisible ? 1 : 0) }}
        aria-hidden={!isOpen}
      >
        {parentLinkVisible ? (
          <CategoryLink
            category={category}
            isChild
            key={category.id}
            onNavigate={onNavigate}
            tabIndex={isOpen && category.enabled !== false ? 0 : -1}
          />
        ) : null}
        {children.map((child) => (
          <CategoryLink
            category={child}
            isChild
            key={child.id}
            onNavigate={onNavigate}
            tabIndex={isOpen && child.enabled !== false ? 0 : -1}
          />
        ))}
      </div>
    </div>
  );
}

export default CategoryGroup;
