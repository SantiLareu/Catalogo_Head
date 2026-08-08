export const CATALOG_POLL_INTERVAL_MS = 60_000;
export const DEFAULT_CATALOG_CHECK_INTERVAL_MS = CATALOG_POLL_INTERVAL_MS;

const VERSION_PATTERN = /^sha256-([a-f0-9]{64})$/;

export class PublishedCatalogError extends Error {
  constructor(kind, message, cause) {
    super(message, { cause });
    this.name = 'PublishedCatalogError';
    this.kind = kind;
  }
}

export function getPublishedCatalogUrl(baseUrl = document.baseURI) {
  return new URL('catalog.json', baseUrl).href;
}

export function getPublishedCatalogVersionUrl(baseUrl = document.baseURI) {
  return new URL('catalog-version.json', baseUrl).href;
}

export function isValidPublishedCatalog(catalog) {
  if (!catalog || typeof catalog !== 'object') return false;
  if (!Array.isArray(catalog.categories) || !Array.isArray(catalog.products)) return false;
  return catalog.products.every((product) =>
    product &&
    typeof product === 'object' &&
    typeof product.id === 'string' &&
    Array.isArray(product.variants) &&
    Array.isArray(product.sizes) &&
    product.variants.every((variant) =>
      variant &&
      typeof variant === 'object' &&
      typeof variant.id === 'string' &&
      Array.isArray(variant.sizes)
    )
  );
}

export function isValidCatalogVersion(manifest) {
  return Boolean(
    manifest &&
    typeof manifest === 'object' &&
    manifest.schemaVersion === 1 &&
    manifest.catalogFile === 'catalog.json' &&
    typeof manifest.version === 'string' &&
    VERSION_PATTERN.test(manifest.version)
  );
}

export function shouldApplyCatalogResponse(requestId, latestAppliedRequestId) {
  return requestId >= latestAppliedRequestId;
}

function appendQuery(url, name, value) {
  const result = new URL(url, globalThis.location?.href || 'http://localhost/');
  result.searchParams.set(name, String(value));
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) return result.href;
  return result.pathname + result.search + result.hash;
}

export async function hashPublishedCatalogBytes(bytes, cryptoImpl = globalThis.crypto) {
  if (!cryptoImpl?.subtle) {
    throw new PublishedCatalogError(
      'crypto',
      'El navegador no ofrece Web Crypto para verificar el catálogo.'
    );
  }
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return 'sha256-' + Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

async function fetchResponse(fetchImpl, url) {
  try {
    return await fetchImpl(url, { cache: 'no-store' });
  } catch (error) {
    throw new PublishedCatalogError(
      'network',
      'No se pudo consultar el catálogo publicado.',
      error
    );
  }
}

function requireOk(response, label) {
  if (!response?.ok) {
    throw new PublishedCatalogError(
      'http',
      `${label} respondió HTTP ${response?.status ?? 'desconocido'}.`
    );
  }
}

export function createPublishedCatalogClient({
  initialCatalog,
  initialVersion,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  minIntervalMs = DEFAULT_CATALOG_CHECK_INTERVAL_MS,
  now = Date.now,
  catalogUrl = getPublishedCatalogUrl(),
  versionUrl = getPublishedCatalogVersionUrl()
}) {
  if (!isValidPublishedCatalog(initialCatalog)) {
    throw new TypeError('El catálogo inicial no tiene una estructura válida.');
  }
  if (!VERSION_PATTERN.test(initialVersion || '')) {
    throw new TypeError('La versión inicial del catálogo no es válida.');
  }

  let activeState = { catalog: initialCatalog, version: initialVersion };
  let inFlight = null;
  let lastSuccessfulCheckAt = null;
  let nextRequestId = 0;
  let latestAppliedRequestId = 0;

  const check = ({ force = false, fresh = false } = {}) => {
    if (inFlight) {
      if (fresh) {
        return inFlight.then(() => check({ force: true }));
      }
      return inFlight;
    }

    const requestedAt = now();
    if (
      !force &&
      lastSuccessfulCheckAt != null &&
      requestedAt - lastSuccessfulCheckAt < minIntervalMs
    ) {
      return Promise.resolve({
        status: 'current',
        ...activeState,
        changed: false,
        skipped: true,
        requestId: latestAppliedRequestId
      });
    }

    const requestId = ++nextRequestId;
    const request = (async () => {
      try {
        const manifestResponse = await fetchResponse(
          fetchImpl,
          appendQuery(versionUrl, 'check', `${requestedAt}-${requestId}`)
        );
        requireOk(manifestResponse, 'La versión del catálogo');

        let manifest;
        try {
          manifest = await manifestResponse.json();
        } catch (error) {
          throw new PublishedCatalogError(
            'invalid',
            'catalog-version.json no contiene JSON válido.',
            error
          );
        }
        if (!isValidCatalogVersion(manifest)) {
          throw new PublishedCatalogError(
            'invalid',
            'catalog-version.json tiene una estructura inválida.'
          );
        }

        if (manifest.version === activeState.version) {
          lastSuccessfulCheckAt = now();
          return {
            status: 'current',
            ...activeState,
            changed: false,
            requestId
          };
        }

        const catalogResponse = await fetchResponse(
          fetchImpl,
          appendQuery(catalogUrl, 'v', manifest.version)
        );
        requireOk(catalogResponse, 'El catálogo');

        let bytes;
        try {
          bytes = await catalogResponse.arrayBuffer();
        } catch (error) {
          throw new PublishedCatalogError(
            'invalid',
            'No se pudieron leer los bytes del catálogo.',
            error
          );
        }

        const actualVersion = await hashPublishedCatalogBytes(bytes, cryptoImpl);
        if (actualVersion !== manifest.version) {
          throw new PublishedCatalogError(
            'hash_mismatch',
            'El SHA-256 del catálogo no coincide con el manifiesto publicado.'
          );
        }

        let remoteCatalog;
        try {
          remoteCatalog = JSON.parse(new TextDecoder().decode(bytes));
        } catch (error) {
          throw new PublishedCatalogError(
            'invalid',
            'El catálogo publicado no contiene JSON válido.',
            error
          );
        }
        if (!isValidPublishedCatalog(remoteCatalog)) {
          throw new PublishedCatalogError(
            'invalid',
            'El catálogo publicado tiene una estructura inválida.'
          );
        }

        if (!shouldApplyCatalogResponse(requestId, latestAppliedRequestId)) {
          return {
            status: 'current',
            ...activeState,
            changed: false,
            stale: true,
            requestId
          };
        }

        activeState = {
          catalog: remoteCatalog,
          version: manifest.version
        };
        latestAppliedRequestId = requestId;
        lastSuccessfulCheckAt = now();
        return {
          status: 'changes_detected',
          ...activeState,
          changed: true,
          stale: false,
          requestId
        };
      } catch (error) {
        const publishedError = error instanceof PublishedCatalogError
          ? error
          : new PublishedCatalogError(
            'invalid',
            'No se pudo validar el catálogo publicado.',
            error
          );
        return {
          status: publishedError.kind === 'network' ? 'unavailable' : 'error',
          ...activeState,
          changed: false,
          error: publishedError,
          requestId
        };
      } finally {
        if (inFlight === request) inFlight = null;
      }
    })();
    inFlight = request;
    return request;
  };

  return {
    check,
    getActiveCatalog: () => activeState.catalog,
    getActiveState: () => activeState,
    getActiveVersion: () => activeState.version,
    getCatalogUrl: () => catalogUrl,
    getVersionUrl: () => versionUrl
  };
}
