export const DEFAULT_CATALOG_CHECK_INTERVAL_MS = 60_000;

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

export function shouldApplyCatalogResponse(requestId, latestAppliedRequestId) {
  return requestId >= latestAppliedRequestId;
}

function fingerprintCatalog(catalog) {
  return JSON.stringify(catalog);
}

export function createPublishedCatalogClient({
  initialCatalog,
  fetchImpl = globalThis.fetch,
  minIntervalMs = DEFAULT_CATALOG_CHECK_INTERVAL_MS,
  now = Date.now,
  url = getPublishedCatalogUrl()
}) {
  if (!isValidPublishedCatalog(initialCatalog)) {
    throw new TypeError('El catálogo inicial no tiene una estructura válida.');
  }

  let activeCatalog = initialCatalog;
  let activeFingerprint = fingerprintCatalog(initialCatalog);
  let inFlight = null;
  let lastSuccessfulCheckAt = null;
  let nextRequestId = 0;
  let latestAppliedRequestId = 0;

  const check = ({ force = false } = {}) => {
    if (inFlight) return inFlight;

    const requestedAt = now();
    if (
      !force &&
      lastSuccessfulCheckAt != null &&
      requestedAt - lastSuccessfulCheckAt < minIntervalMs
    ) {
      return Promise.resolve({
        status: 'current',
        catalog: activeCatalog,
        changed: false,
        skipped: true,
        requestId: latestAppliedRequestId
      });
    }

    const requestId = ++nextRequestId;
    const request = (async () => {
      try {
        let response;
        try {
          response = await fetchImpl(url, { cache: 'no-store' });
        } catch (error) {
          throw new PublishedCatalogError(
            'network',
            'No se pudo consultar el catálogo publicado.',
            error
          );
        }

        if (!response?.ok) {
          throw new PublishedCatalogError(
            'http',
            `La consulta del catálogo respondió HTTP ${response?.status ?? 'desconocido'}.`
          );
        }

        let remoteCatalog;
        try {
          remoteCatalog = await response.json();
        } catch (error) {
          throw new PublishedCatalogError('invalid', 'El catálogo publicado no contiene JSON válido.', error);
        }
        if (!isValidPublishedCatalog(remoteCatalog)) {
          throw new PublishedCatalogError('invalid', 'El catálogo publicado tiene una estructura inválida.');
        }

        if (!shouldApplyCatalogResponse(requestId, latestAppliedRequestId)) {
          return {
            status: 'current',
            catalog: activeCatalog,
            changed: false,
            stale: true,
            requestId
          };
        }

        const remoteFingerprint = fingerprintCatalog(remoteCatalog);
        const changed = remoteFingerprint !== activeFingerprint;
        activeCatalog = remoteCatalog;
        activeFingerprint = remoteFingerprint;
        latestAppliedRequestId = requestId;
        lastSuccessfulCheckAt = now();

        return {
          status: changed ? 'changes_detected' : 'current',
          catalog: activeCatalog,
          changed,
          stale: false,
          requestId
        };
      } catch (error) {
        const publishedError = error instanceof PublishedCatalogError
          ? error
          : new PublishedCatalogError('invalid', 'No se pudo validar el catálogo publicado.', error);
        return {
          status: publishedError.kind === 'network' ? 'unavailable' : 'error',
          catalog: activeCatalog,
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
    getActiveCatalog: () => activeCatalog,
    getUrl: () => url
  };
}
