const SHA256_PREFIX = 'sha256-';

export function getShortCatalogVersion(version, length = 8) {
  const value = String(version || '');
  const digest = value.startsWith(SHA256_PREFIX)
    ? value.slice(SHA256_PREFIX.length)
    : value;

  return digest.slice(0, length);
}

export function shouldNotifyCatalogUpdate(lastNotifiedVersion, result) {
  return Boolean(
    result?.changed &&
    result.version &&
    result.version !== lastNotifiedVersion
  );
}
