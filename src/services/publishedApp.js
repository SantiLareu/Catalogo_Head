import { startCatalogPolling } from './catalogPolling.js';

export const APP_POLL_INTERVAL_MS = 60_000;
export const APP_RELOAD_STORAGE_KEY = 'realstep-head-app-reload-target';

const VERSION_PATTERN = /^sha256-[a-f0-9]{64}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export function getLoadedAppVersion(documentTarget = globalThis.document) {
  if (typeof __REALSTEP_APP_VERSION__ !== 'undefined') {
    return __REALSTEP_APP_VERSION__;
  }
  return documentTarget
    ?.querySelector?.('meta[name="realstep-app-version"]')
    ?.getAttribute?.('content') || null;
}

export function getPublishedAppVersionUrl(baseUrl = globalThis.document?.baseURI) {
  return new URL('app-version.json', baseUrl).href;
}

export function isValidAppVersionManifest(manifest) {
  if (
    !manifest ||
    manifest.schemaVersion !== 1 ||
    !VERSION_PATTERN.test(manifest.version) ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0
  ) return false;

  const paths = new Set();
  return manifest.files.every((file) => {
    const valid =
      file &&
      isSafePublishedPath(file.path) &&
      Number.isSafeInteger(file.size) &&
      file.size >= 0 &&
      HASH_PATTERN.test(file.sha256) &&
      !paths.has(file.path);
    paths.add(file?.path);
    return valid;
  });
}

export function createPublishedAppClient({
  loadedVersion,
  fetchImpl = globalThis.fetch,
  cryptoImpl = globalThis.crypto,
  baseUrl = globalThis.document?.baseURI,
  versionUrl = getPublishedAppVersionUrl(baseUrl),
  reload = () => globalThis.location?.reload(),
  storage = globalThis.sessionStorage,
  isReloadSafe = () => true,
  now = Date.now
} = {}) {
  let checking = null;
  let reloadRequested = false;
  let requestId = 0;

  async function check() {
    if (checking) return checking;
    checking = performCheck().finally(() => {
      checking = null;
    });
    return checking;
  }

  async function performCheck() {
    if (!VERSION_PATTERN.test(loadedVersion) || reloadRequested) {
      return { status: 'inactive', reloaded: false };
    }

    let response;
    try {
      requestId += 1;
      response = await fetchImpl(
        appendQuery(versionUrl, 'check', `${now()}-${requestId}`),
        { cache: 'no-store' }
      );
    } catch {
      return { status: 'unavailable', reloaded: false };
    }
    if (!response.ok) return { status: 'error', reloaded: false };

    let manifest;
    try {
      manifest = await response.json();
    } catch {
      return { status: 'invalid', reloaded: false };
    }
    if (!isValidAppVersionManifest(manifest)) {
      return { status: 'invalid', reloaded: false };
    }
    if (manifest.version === loadedVersion) {
      removeStorage(storage, APP_RELOAD_STORAGE_KEY);
      return { status: 'current', reloaded: false, version: manifest.version };
    }
    if (!isReloadSafe()) {
      return { status: 'deferred', reloaded: false, version: manifest.version };
    }
    if (readStorage(storage, APP_RELOAD_STORAGE_KEY) === manifest.version) {
      return { status: 'reload_already_requested', reloaded: false, version: manifest.version };
    }
    if (!await isDeploymentReady(manifest, { fetchImpl, cryptoImpl, baseUrl })) {
      return { status: 'deploy_incomplete', reloaded: false, version: manifest.version };
    }
    if (!isReloadSafe()) {
      return { status: 'deferred', reloaded: false, version: manifest.version };
    }

    reloadRequested = true;
    if (!writeStorage(storage, APP_RELOAD_STORAGE_KEY, manifest.version)) {
      reloadRequested = false;
      return { status: 'reload_guard_unavailable', reloaded: false, version: manifest.version };
    }
    reload();
    return { status: 'reload_requested', reloaded: true, version: manifest.version };
  }

  return { check, getLoadedVersion: () => loadedVersion };
}

export function startAppVersionPolling({
  client,
  documentTarget = document,
  windowTarget = window,
  intervalMs = APP_POLL_INTERVAL_MS,
  setIntervalImpl = setInterval,
  clearIntervalImpl = clearInterval
}) {
  return startCatalogPolling({
    check: () => client.check(),
    documentTarget,
    windowTarget,
    intervalMs,
    setIntervalImpl,
    clearIntervalImpl
  });
}

async function isDeploymentReady(manifest, { fetchImpl, cryptoImpl, baseUrl }) {
  if (!cryptoImpl?.subtle) return false;
  try {
    for (const file of manifest.files) {
      const fileUrl = new URL(file.path, baseUrl);
      fileUrl.searchParams.set('ready', manifest.version);
      const response = await fetchImpl(fileUrl.href, { cache: 'no-store' });
      if (!response.ok) return false;
      const contents = new Uint8Array(await response.arrayBuffer());
      if (contents.byteLength !== file.size) return false;
      const digest = new Uint8Array(
        await cryptoImpl.subtle.digest('SHA-256', contents)
      );
      if (bytesToHex(digest) !== file.sha256) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function isSafePublishedPath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !/[\u0000-\u001F\u007F]/.test(value) &&
    !value.includes('\\') &&
    !value.includes('?') &&
    !value.includes('#') &&
    !value.includes('%') &&
    !value.includes(':') &&
    !value.startsWith('/') &&
    !value.split('/').some((part) => !part || part === '.' || part === '..')
  );
}

function appendQuery(url, name, value) {
  const result = new URL(url, globalThis.document?.baseURI);
  result.searchParams.set(name, value);
  return result.href;
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function readStorage(storage, key) {
  try {
    return storage?.getItem?.(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorage(storage, key, value) {
  try {
    if (!storage?.setItem) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function removeStorage(storage, key) {
  try {
    storage?.removeItem?.(key);
  } catch {
    // No impide reconocer que este build ya es el publicado.
  }
}
