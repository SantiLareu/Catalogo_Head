import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as signBytes,
  verify as verifyBytes
} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const MANIFEST_FILE = 'integrity-manifest.json';
export const SIGNATURE_FILE = 'integrity-manifest.sig';
export const PUBLIC_KEY_FILE = 'signing-public-key.pem';
export const HASH_ALGORITHM = 'SHA-256';
export const SIGNATURE_ALGORITHM = 'Ed25519';
const COMMIT_PATTERN = /^[A-Za-z0-9._-]{7,128}$/;
const FINGERPRINT_PATTERN = /^SHA256:([A-Za-z0-9_-]{43})$/;

export class IntegrityError extends Error {
  constructor(code, message, cause) {
    super(message, cause ? { cause } : undefined);
    this.name = 'IntegrityError';
    this.code = code;
  }
}

export function canonicalize(value) {
  return canonicalizeValue(value, new WeakSet());
}

function canonicalizeValue(value, ancestors) {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw manifestValueError('Los números del manifiesto deben ser finitos.');
    }
    return JSON.stringify(value);
  }
  if (typeof value !== 'object') {
    throw manifestValueError(`Tipo no representable en JSON: ${typeof value}.`);
  }
  if (ancestors.has(value)) {
    throw manifestValueError('El manifiesto no puede contener referencias circulares.');
  }
  const prototype = Object.getPrototypeOf(value);
  if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null) {
    throw manifestValueError('El manifiesto solo admite objetos JSON planos.');
  }
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw manifestValueError('El manifiesto no admite propiedades Symbol.');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw manifestValueError('El manifiesto no admite arrays dispersos.');
        }
      }
      return '[' + value
        .map((item) => canonicalizeValue(item, ancestors))
        .join(',') + ']';
    }
    return '{' + Object.keys(value)
      .sort()
      .map((key) =>
        JSON.stringify(key) + ':' + canonicalizeValue(value[key], ancestors)
      )
      .join(',') + '}';
  } finally {
    ancestors.delete(value);
  }
}

function manifestValueError(message) {
  return new IntegrityError('MANIFEST_INVALID', message);
}

export function serializeManifest(manifest) {
  return JSON.stringify(sortObject(manifest), null, 2) + '\n';
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, sortObject(value[key])])
  );
}

export function sha256(contents) {
  return createHash('sha256').update(contents).digest('hex');
}

export function publicKeyFingerprint(publicKeyPem) {
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
    if (publicKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('La clave no es Ed25519.');
    }
  } catch (error) {
    throw new IntegrityError('PUBLIC_KEY_INVALID', 'La clave pública no es válida.', error);
  }
  const der = publicKey.export({ type: 'spki', format: 'der' });
  return 'SHA256:' + createHash('sha256').update(der).digest('base64url');
}

export function derivePublicKeyPem(privateKeyPem) {
  try {
    const privateKey = createPrivateKey(privateKeyPem);
    if (privateKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('La clave no es Ed25519.');
    }
    return createPublicKey(privateKey)
      .export({ type: 'spki', format: 'pem' })
      .toString();
  } catch (error) {
    throw new IntegrityError('PRIVATE_KEY_INVALID', 'La clave privada no es válida.', error);
  }
}

export function signManifest(manifest, privateKeyPem) {
  const canonicalManifest = canonicalize(manifest);
  try {
    const privateKey = createPrivateKey(privateKeyPem);
    if (privateKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('La clave no es Ed25519.');
    }
    return signBytes(
      null,
      Buffer.from(canonicalManifest, 'utf8'),
      privateKey
    ).toString('base64');
  } catch (error) {
    throw new IntegrityError('SIGNING_FAILED', 'No se pudo firmar el manifiesto.', error);
  }
}

export function verifyManifestSignature(manifest, signatureBase64, publicKeyPem) {
  let publicKey;
  try {
    publicKey = createPublicKey(publicKeyPem);
    if (publicKey.asymmetricKeyType !== 'ed25519') {
      throw new Error('La clave no es Ed25519.');
    }
  } catch (error) {
    throw new IntegrityError('PUBLIC_KEY_INVALID', 'La clave pública no es válida.', error);
  }
  const signature = decodeStrictEd25519Signature(signatureBase64);
  if (!verifyBytes(
    null,
    Buffer.from(canonicalize(manifest), 'utf8'),
    publicKey,
    signature
  )) {
    throw new IntegrityError('SIGNATURE_INVALID', 'La firma del manifiesto es inválida.');
  }
}

export function decodeStrictEd25519Signature(value) {
  if (typeof value !== 'string') {
    throw new IntegrityError('SIGNATURE_INVALID', 'La firma debe ser una cadena Base64.');
  }
  const normalized = value.trim();
  const base64Pattern =
    /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
  if (
    !normalized ||
    normalized.length % 4 !== 0 ||
    !base64Pattern.test(normalized)
  ) {
    throw new IntegrityError(
      'SIGNATURE_INVALID',
      'La firma no contiene Base64 estándar válido.'
    );
  }
  const signature = Buffer.from(normalized, 'base64');
  if (signature.toString('base64') !== normalized) {
    throw new IntegrityError(
      'SIGNATURE_INVALID',
      'La firma Base64 no tiene una representación canónica válida.'
    );
  }
  if (signature.length !== 64) {
    throw new IntegrityError(
      'SIGNATURE_INVALID',
      'Una firma Ed25519 debe contener exactamente 64 bytes.'
    );
  }
  return signature;
}

export async function hashPublicationFiles(publicationRoot, relativePaths) {
  const uniquePaths = Array.from(new Set(relativePaths)).sort();
  const files = [];
  for (const relativePath of uniquePaths) {
    const safePath = normalizePublicationPath(relativePath);
    const filePath = await resolveProtectedFile(publicationRoot, safePath);
    let contents;
    try {
      contents = await fs.readFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new IntegrityError('FILE_MISSING', `Falta el archivo protegido: ${safePath}`, error);
      }
      throw error;
    }
    files.push({ path: safePath, sha256: sha256(contents), size: contents.length });
  }
  return files;
}

export function normalizePublicationPath(relativePath) {
  if (
    typeof relativePath !== 'string' ||
    !relativePath ||
    /[\u0000-\u001F\u007F]/.test(relativePath) ||
    relativePath.includes('\\') ||
    relativePath.includes('?') ||
    relativePath.includes('#') ||
    relativePath.includes('%') ||
    relativePath.startsWith('/') ||
    relativePath.startsWith('//') ||
    /^[A-Za-z][A-Za-z0-9+.-]*:/.test(relativePath) ||
    /^[A-Za-z]:/.test(relativePath) ||
    path.posix.isAbsolute(relativePath) ||
    path.posix.normalize(relativePath) !== relativePath ||
    relativePath.split('/').some((segment) => !segment || segment === '..')
  ) {
    throw new IntegrityError('MANIFEST_INVALID', `Ruta protegida inválida: ${relativePath}`);
  }
  return relativePath;
}

export function resolveProtectedPath(publicationRoot, relativePath) {
  const safePath = normalizePublicationPath(relativePath);
  const absoluteRoot = path.resolve(publicationRoot);
  const absoluteFile = path.resolve(absoluteRoot, ...safePath.split('/'));
  assertPathInsideRoot(absoluteRoot, absoluteFile, safePath);
  return absoluteFile;
}

export async function resolveProtectedFile(publicationRoot, relativePath) {
  const safePath = normalizePublicationPath(relativePath);
  const absoluteFile = resolveProtectedPath(publicationRoot, safePath);
  let realRoot;
  let realFile;
  try {
    [realRoot, realFile] = await Promise.all([
      fs.realpath(path.resolve(publicationRoot)),
      fs.realpath(absoluteFile)
    ]);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new IntegrityError('FILE_MISSING', `Falta el archivo protegido: ${safePath}`, error);
    }
    throw error;
  }
  assertPathInsideRoot(realRoot, realFile, safePath);
  return realFile;
}

function assertPathInsideRoot(absoluteRoot, absoluteFile, relativePath) {
  const relative = path.relative(absoluteRoot, absoluteFile);
  const escapesRoot =
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
  if (escapesRoot) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      `La ruta protegida escapa de publicationRoot: ${relativePath}`
    );
  }
}

export function validateManifest(manifest, expected = {}) {
  if (
    !manifest ||
    manifest.formatVersion !== 1 ||
    manifest.hashAlgorithm !== HASH_ALGORITHM ||
    manifest.signatureAlgorithm !== SIGNATURE_ALGORITHM ||
    !Array.isArray(manifest.files) ||
    manifest.files.length === 0
  ) {
    throw new IntegrityError('MANIFEST_INVALID', 'El manifiesto tiene un formato inválido.');
  }
  for (const field of ['projectId', 'owner', 'developer', 'licensedTo', 'softwareId', 'licenseId', 'version', 'createdAt', 'publicKeyFingerprint']) {
    if (typeof manifest[field] !== 'string' || !manifest[field]) {
      throw new IntegrityError('MANIFEST_INVALID', `Falta el campo requerido: ${field}`);
    }
  }
  const createdAt = new Date(manifest.createdAt);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(manifest.createdAt) ||
    Number.isNaN(createdAt.getTime()) ||
    createdAt.toISOString() !== manifest.createdAt
  ) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      'createdAt debe usar el formato UTC exacto de Date.prototype.toISOString().'
    );
  }
  if (
    manifest.commit !== null &&
    (
      typeof manifest.commit !== 'string' ||
      !COMMIT_PATTERN.test(manifest.commit)
    )
  ) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      'commit debe ser null o un identificador de 7 a 128 caracteres ASCII seguros.'
    );
  }
  const fingerprintMatch = FINGERPRINT_PATTERN.exec(manifest.publicKeyFingerprint);
  if (!fingerprintMatch) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      'publicKeyFingerprint debe usar SHA256: seguido de Base64URL sin padding.'
    );
  }
  const fingerprintBytes = Buffer.from(
    fingerprintMatch[1].replaceAll('-', '+').replaceAll('_', '/') + '=',
    'base64'
  );
  if (
    fingerprintBytes.length !== 32 ||
    fingerprintBytes.toString('base64url') !== fingerprintMatch[1]
  ) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      'publicKeyFingerprint no representa un hash SHA-256 válido.'
    );
  }
  for (const [field, expectedValue] of Object.entries(expected)) {
    if (expectedValue != null && manifest[field] !== expectedValue) {
      throw new IntegrityError(
        'MANIFEST_INVALID',
        `El campo ${field} no coincide con la publicación esperada.`
      );
    }
  }
  const seen = new Set();
  for (const file of manifest.files) {
    const normalized = normalizePublicationPath(file?.path);
    if (
      normalized !== file.path ||
      !/^[a-f0-9]{64}$/.test(file?.sha256) ||
      !Number.isSafeInteger(file?.size) ||
      file.size < 0 ||
      seen.has(file.path)
    ) {
      throw new IntegrityError('MANIFEST_INVALID', 'La lista de archivos protegidos es inválida.');
    }
    seen.add(file.path);
  }
}

export async function verifyPublication({
  publicationRoot,
  manifest,
  signature,
  publicKeyPem,
  expected = {}
}) {
  validateManifest(manifest, expected);
  const fingerprint = publicKeyFingerprint(publicKeyPem);
  if (manifest.publicKeyFingerprint !== fingerprint) {
    throw new IntegrityError(
      'PUBLIC_KEY_INVALID',
      'La clave pública no coincide con el fingerprint del manifiesto.'
    );
  }
  verifyManifestSignature(manifest, signature, publicKeyPem);
  for (const file of manifest.files) {
    const filePath = await resolveProtectedFile(publicationRoot, file.path);
    let contents;
    try {
      contents = await fs.readFile(filePath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new IntegrityError('FILE_MISSING', `Falta el archivo protegido: ${file.path}`, error);
      }
      throw error;
    }
    if (contents.length !== file.size || sha256(contents) !== file.sha256) {
      throw new IntegrityError('HASH_MISMATCH', `Hash incorrecto para: ${file.path}`);
    }
  }
  return {
    verified: true,
    projectId: manifest.projectId,
    softwareId: manifest.softwareId,
    licenseId: manifest.licenseId,
    version: manifest.version
  };
}

export async function readJson(filePath, label) {
  let source;
  try {
    source = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new IntegrityError('FILE_MISSING', `No existe ${label}: ${filePath}`, error);
    }
    throw error;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new IntegrityError('MANIFEST_INVALID', `${label} no contiene JSON válido.`, error);
  }
}

export async function readText(filePath, label) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new IntegrityError('FILE_MISSING', `No existe ${label}: ${filePath}`, error);
    }
    throw error;
  }
}
