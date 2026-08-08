const REQUIRED_MANIFEST_FIELDS = [
  'projectId',
  'owner',
  'developer',
  'licensedTo',
  'softwareId',
  'licenseId',
  'version',
  'createdAt',
  'publicKeyFingerprint'
];
const COMMIT_PATTERN = /^[A-Za-z0-9._-]{7,128}$/;
const FINGERPRINT_PATTERN = /^SHA256:([A-Za-z0-9_-]{43})$/;
const STANDARD_BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

class PublishedContentError extends Error {}

export function canonicalize(value) {
  return canonicalizeValue(value, new WeakSet());
}

function canonicalizeValue(value, ancestors) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Los números deben ser finitos.');
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw new TypeError(`Tipo no representable en JSON: ${typeof value}.`);
  }
  if (ancestors.has(value)) throw new TypeError('Referencia circular.');
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('Solo se admiten objetos JSON planos.');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TypeError('No se admiten propiedades Symbol.');
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) throw new TypeError('Array disperso.');
      }
      return '[' + value.map((item) => canonicalizeValue(item, ancestors)).join(',') + ']';
    }
    return '{' + Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ':' + canonicalizeValue(value[key], ancestors))
      .join(',') + '}';
  } finally {
    ancestors.delete(value);
  }
}

export async function verifyPublishedIntegrity(
  companyConfig,
  {
    fetchImpl = globalThis.fetch,
    cryptoImpl = globalThis.crypto,
    baseUrl = new URL(/* @vite-ignore */ '../../', import.meta.url)
  } = {}
) {
  if (!fetchImpl || !cryptoImpl?.subtle) return 'unavailable';

  const publicationBase = normalizeBaseUrl(baseUrl);
  const artifactUrls = [
    new URL('integrity-manifest.json', publicationBase),
    new URL('integrity-manifest.sig', publicationBase),
    new URL('signing-public-key.pem', publicationBase)
  ];
  let responses;
  try {
    responses = await Promise.all(
      artifactUrls.map((url) => fetchImpl(url, { cache: 'no-store' }))
    );
  } catch {
    return 'error';
  }

  const missingCount = responses.filter((response) => response.status === 404).length;
  if (missingCount === responses.length) return 'unavailable';
  if (missingCount > 0) return 'invalid';
  if (responses.some((response) => !response.ok)) return 'error';

  let manifestSource;
  let signatureBase64;
  let publicKeyPem;
  try {
    [manifestSource, signatureBase64, publicKeyPem] = await Promise.all([
      responses[0].text(),
      responses[1].text(),
      responses[2].text()
    ]);
  } catch {
    return 'error';
  }

  try {
    let manifest;
    try {
      manifest = JSON.parse(manifestSource);
    } catch (error) {
      throw new PublishedContentError('Manifiesto JSON inválido.', { cause: error });
    }
    if (!isManifestValid(manifest, companyConfig)) {
      throw new PublishedContentError('Manifiesto inválido.');
    }

    const publicKeyDer = pemToBytes(publicKeyPem);
    const fingerprint = await sha256Bytes(cryptoImpl, publicKeyDer);
    if (manifest.publicKeyFingerprint !== 'SHA256:' + bytesToBase64Url(fingerprint)) {
      throw new PublishedContentError('Fingerprint inválido.');
    }

    let publicKey;
    try {
      publicKey = await cryptoImpl.subtle.importKey(
        'spki',
        publicKeyDer,
        { name: 'Ed25519' },
        false,
        ['verify']
      );
    } catch (error) {
      throw new PublishedContentError('Clave pública inválida.', { cause: error });
    }
    const signature = decodeStrictEd25519Signature(signatureBase64);
    let signatureValid;
    try {
      let canonicalManifest;
      try {
        canonicalManifest = canonicalize(manifest);
      } catch (error) {
        throw new PublishedContentError('Canonicalización inválida.', { cause: error });
      }
      signatureValid = await cryptoImpl.subtle.verify(
        { name: 'Ed25519' },
        publicKey,
        signature,
        new TextEncoder().encode(canonicalManifest)
      );
    } catch (error) {
      throw new PublishedContentError('No se pudo verificar la firma.', { cause: error });
    }
    if (!signatureValid) throw new PublishedContentError('Firma inválida.');

    const protectedUrls = manifest.files.map((file) =>
      resolveProtectedUrl(file.path, publicationBase)
    );
    for (let index = 0; index < manifest.files.length; index += 1) {
      let response;
      try {
        response = await fetchImpl(protectedUrls[index], { cache: 'no-store' });
      } catch {
        return 'error';
      }
      if (!response.ok) return response.status === 404 ? 'invalid' : 'error';
      let contents;
      try {
        contents = new Uint8Array(await response.arrayBuffer());
      } catch {
        return 'error';
      }
      const digest = await sha256Bytes(cryptoImpl, contents);
      if (
        contents.byteLength !== manifest.files[index].size ||
        bytesToHex(digest) !== manifest.files[index].sha256
      ) {
        return 'invalid';
      }
    }
    return 'verified';
  } catch (error) {
    return error instanceof PublishedContentError ? 'invalid' : 'error';
  }
}

export function isManifestValid(manifest, companyConfig) {
  const ownership = companyConfig?.ownership;
  const license = companyConfig?.license;
  const software = companyConfig?.software;
  if (
    !manifest ||
    manifest.formatVersion !== 1 ||
    manifest.hashAlgorithm !== 'SHA-256' ||
    manifest.signatureAlgorithm !== 'Ed25519' ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0 ||
    REQUIRED_MANIFEST_FIELDS.some(
      (field) => typeof manifest[field] !== 'string' || !manifest[field]
    )
  ) return false;
  if (
    manifest.projectId !== ownership?.projectId ||
    manifest.owner !== ownership?.owner ||
    manifest.developer !== ownership?.developer ||
    manifest.licensedTo !== license?.licensedTo ||
    manifest.licenseId !== license?.licenseId ||
    manifest.softwareId !== software?.softwareId
  ) return false;
  if (
    manifest.commit !== null &&
    (typeof manifest.commit !== 'string' || !COMMIT_PATTERN.test(manifest.commit))
  ) return false;
  if (!isFingerprintValid(manifest.publicKeyFingerprint)) return false;
  const createdAt = new Date(manifest.createdAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(manifest.createdAt) ||
    Number.isNaN(createdAt.getTime()) ||
    createdAt.toISOString() !== manifest.createdAt
  ) return false;

  const paths = new Set();
  return manifest.files.every((file) => {
    const valid =
      file &&
      isProtectedPathSyntaxValid(file.path) &&
      /^[a-f0-9]{64}$/.test(file.sha256) &&
      Number.isSafeInteger(file.size) &&
      file.size >= 0 &&
      !paths.has(file.path);
    paths.add(file?.path);
    return valid;
  });
}

export function resolveProtectedUrl(relativePath, baseUrl) {
  if (!isProtectedPathSyntaxValid(relativePath)) {
    throw new PublishedContentError('Ruta protegida inválida.');
  }
  const publicationBase = normalizeBaseUrl(baseUrl);
  const resolved = new URL(relativePath, publicationBase);
  if (
    resolved.origin !== publicationBase.origin ||
    !resolved.pathname.startsWith(publicationBase.pathname)
  ) {
    throw new PublishedContentError('La URL protegida escapa de la publicación.');
  }
  return resolved;
}

function normalizeBaseUrl(baseUrl) {
  const base = new URL(baseUrl);
  base.search = '';
  base.hash = '';
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  return base;
}

function isProtectedPathSyntaxValid(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !/[\u0000-\u001F\u007F]/.test(value) &&
    !value.includes('\\') &&
    !value.includes('?') &&
    !value.includes('#') &&
    !value.includes('%') &&
    !value.startsWith('/') &&
    !value.startsWith('//') &&
    !/^[A-Za-z][A-Za-z0-9+.-]*:/.test(value) &&
    !/^[A-Za-z]:/.test(value) &&
    !value.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  );
}

export function decodeStrictEd25519Signature(value) {
  const bytes = decodeStrictBase64(value, 'Firma Base64 inválida.');
  if (bytes.byteLength !== 64) {
    throw new PublishedContentError('La firma Ed25519 debe medir 64 bytes.');
  }
  return bytes;
}

export function pemToBytes(pem) {
  if (typeof pem !== 'string') throw new PublishedContentError('PEM inválido.');
  const match = /^\s*-----BEGIN PUBLIC KEY-----\r?\n([A-Za-z0-9+/=\r\n]+)\r?\n-----END PUBLIC KEY-----\s*$/.exec(pem);
  if (!match || pem.match(/-----BEGIN PUBLIC KEY-----/g)?.length !== 1) {
    throw new PublishedContentError('PEM de clave pública inválido.');
  }
  const body = match[1].replace(/\r?\n/g, '');
  return decodeStrictBase64(body, 'Base64 del PEM inválido.');
}

function decodeStrictBase64(value, message) {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length % 4 !== 0 ||
    !STANDARD_BASE64_PATTERN.test(value)
  ) throw new PublishedContentError(message);
  let bytes;
  try {
    bytes = base64ToBytes(value);
  } catch (error) {
    throw new PublishedContentError(message, { cause: error });
  }
  if (bytesToBase64(bytes) !== value) throw new PublishedContentError(message);
  return bytes;
}

function isFingerprintValid(value) {
  const match = FINGERPRINT_PATTERN.exec(value);
  if (!match) return false;
  try {
    const padded = match[1].replaceAll('-', '+').replaceAll('_', '/') + '=';
    const bytes = base64ToBytes(padded);
    return bytes.byteLength === 32 && bytesToBase64Url(bytes) === match[1];
  } catch {
    return false;
  }
}

function base64ToBytes(value) {
  if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(value, 'base64'));
  const binary = globalThis.atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256Bytes(cryptoImpl, contents) {
  return new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', contents));
}

function bytesToHex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function bytesToBase64Url(bytes) {
  return bytesToBase64(bytes)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function bytesToBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64');
  return globalThis.btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')
  );
}
