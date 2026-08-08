import { CATALOG_POLL_INTERVAL_MS } from './publishedCatalog.js';

export function startCatalogPolling({
  check,
  documentTarget = document,
  windowTarget = window,
  intervalMs = CATALOG_POLL_INTERVAL_MS,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval
}) {
  const checkWhenActive = () => {
    if (!documentTarget.hidden) void check({ background: true });
  };
  const checkWhenVisible = () => {
    if (!documentTarget.hidden) void check({ background: true });
  };

  const intervalId = setIntervalImpl(checkWhenActive, intervalMs);
  documentTarget.addEventListener('visibilitychange', checkWhenVisible);
  windowTarget.addEventListener('focus', checkWhenActive);

  return () => {
    clearIntervalImpl(intervalId);
    documentTarget.removeEventListener('visibilitychange', checkWhenVisible);
    windowTarget.removeEventListener('focus', checkWhenActive);
  };
}
