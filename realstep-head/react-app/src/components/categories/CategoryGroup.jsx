import CategoryLink from './CategoryLink.jsx';

function CategoryGroup({ category, idPrefix, isOpen, onNavigate, onToggle }) {
  const submenuId = `${idPrefix}-category-submenu-${category.id}`;
  const children = Array.isArray(category.children) ? category.children : [];

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
        style={{ '--category-submenu-count': children.length }}
        aria-hidden={!isOpen}
      >
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
