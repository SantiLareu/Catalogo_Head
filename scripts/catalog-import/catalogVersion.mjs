import crypto from 'node:crypto';

export const CATALOG_VERSION_SCHEMA = 1;
export const PUBLISHED_CATALOG_FILE = 'catalog.json';

export function hashCatalogBytes(catalogContents) {
  return 'sha256-' + crypto
    .createHash('sha256')
    .update(catalogContents, 'utf8')
    .digest('hex');
}

export function buildCatalogVersion(catalogContents) {
  return {
    schemaVersion: CATALOG_VERSION_SCHEMA,
    version: hashCatalogBytes(catalogContents),
    catalogFile: PUBLISHED_CATALOG_FILE
  };
}

export function serializeCatalogVersion(catalogVersion) {
  return JSON.stringify(catalogVersion, null, 2) + '\n';
}

export function createCatalogVersionContents(catalogContents) {
  return serializeCatalogVersion(buildCatalogVersion(catalogContents));
}
