function normalizeHash(hash) {
  if (!hash) {
    return '';
  }

  try {
    return decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    return hash.replace(/^#/, '');
  }
}

export function scrollToHashTarget(hash, updateHash = true) {
  const targetId = normalizeHash(hash);
  const target = targetId ? document.getElementById(targetId) : null;

  if (!target) {
    return false;
  }

  if (updateHash && window.location.hash !== `#${targetId}`) {
    window.history.pushState(null, '', `#${targetId}`);
  }

  target.scrollIntoView({ behavior: 'smooth' });
  return true;
}
