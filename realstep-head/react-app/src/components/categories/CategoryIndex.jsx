import { useEffect, useState } from 'react';
import CategoryGroup from './CategoryGroup.jsx';
import CategoryLink from './CategoryLink.jsx';

function getParentForHash(categories, hash) {
  let target = '';

  try {
    target = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    target = hash.replace(/^#/, '');
  }

  return categories.find((category) =>
    (Array.isArray(category.children) ? category.children : []).some(
      (child) => child.target === target
    )
  );
}

function CategoryIndex({
  categories,
  id = 'category-index',
  idPrefix = 'catalog',
  onNavigate,
  variant = 'page'
}) {
  const [openGroups, setOpenGroups] = useState(() => {
    const parent = getParentForHash(categories, window.location.hash);
    return parent ? { [parent.id]: true } : {};
  });

  useEffect(() => {
    const openParentForHash = () => {
      const parent = getParentForHash(categories, window.location.hash);

      if (parent) {
        setOpenGroups((current) => ({ ...current, [parent.id]: true }));
      }
    };

    openParentForHash();
    window.addEventListener('hashchange', openParentForHash);

    return () => {
      window.removeEventListener('hashchange', openParentForHash);
    };
  }, [categories]);

  const handleToggle = (categoryId) => {
    setOpenGroups((current) => ({
      ...current,
      [categoryId]: !current[categoryId]
    }));
  };

  return (
    <nav
      className={`category-index-section category-index-section--${variant}`}
      id={id}
      aria-label="Categorías"
    >
      <div className="category-index-list">
        {categories.map((category) => {
          const children = Array.isArray(category.children) ? category.children : [];

          return children.length > 0 ? (
            <CategoryGroup
              category={category}
              isOpen={Boolean(openGroups[category.id])}
              idPrefix={idPrefix}
              key={category.id}
              onNavigate={onNavigate}
              onToggle={handleToggle}
            />
          ) : (
            <CategoryLink category={category} key={category.id} onNavigate={onNavigate} />
          );
        })}
      </div>
    </nav>
  );
}

export default CategoryIndex;
