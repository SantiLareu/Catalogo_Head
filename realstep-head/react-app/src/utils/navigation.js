export function normalizeHash(hash) {
  if (!hash) {
    return '';
  }

  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return hash.replace(/^#/, '');
  }
}

export function getCatalogTargetIds(categories = []) {
  const targets = new Set(['inicio', 'category-index']);

  const visit = (items) => {
    for (const category of items) {
      if (typeof category?.target === 'string' && category.target) {
        targets.add(category.target);
      }
      if (Array.isArray(category?.children)) visit(category.children);
    }
  };

  visit(categories);
  return targets;
}

export function resolveCatalogHash(hash, validTargetIds) {
  const targetId = normalizeHash(hash);
  return targetId && validTargetIds.has(targetId) ? `#${targetId}` : '#inicio';
}

export function scrollToHashTarget(hash, updateHash = true, behavior = 'smooth') {
  const targetId = normalizeHash(hash);
  const target = targetId ? document.getElementById(targetId) : null;

  if (!target) {
    return false;
  }

  if (updateHash && window.location.hash !== `#${targetId}`) {
    window.history.pushState(null, '', `#${targetId}`);
  }

  target.scrollIntoView({ behavior });
  return true;
}
