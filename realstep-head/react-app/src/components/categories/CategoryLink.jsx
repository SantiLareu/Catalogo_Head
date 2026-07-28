import { scrollToHashTarget } from '../../utils/navigation.js';

function CategoryLink({ category, isChild = false, tabIndex }) {
  const isEnabled = category.enabled !== false;
  const className = `${isChild ? 'category-index-subitem' : 'category-index-item'} ${
    isEnabled ? 'enabled' : 'disabled'
  }`;

  const handleClick = () => {
    if (isEnabled) {
      scrollToHashTarget(`#${category.target}`);
    }
  };

  return (
    <button
      type="button"
      className={className}
      data-category-id={category.id}
      data-category-target={category.target}
      disabled={!isEnabled}
      tabIndex={tabIndex}
      onClick={handleClick}
    >
      <span>{category.label}</span>
      {isEnabled ? (
        <span className="category-index-arrow" aria-hidden="true">
          ›
        </span>
      ) : (
        <span className="category-index-status">Próximamente</span>
      )}
    </button>
  );
}

export default CategoryLink;
