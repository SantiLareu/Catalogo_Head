import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import {
  HASH_ALGORITHM,
  IntegrityError,
  MANIFEST_FILE,
  PUBLIC_KEY_FILE,
  SIGNATURE_ALGORITHM,
  SIGNATURE_FILE,
  canonicalize,
  derivePublicKeyPem,
  hashPublicationFiles,
  publicKeyFingerprint,
  readJson,
  readText,
  serializeManifest,
  signManifest,
  verifyPublication
} from './integrityCore.mjs';
import {
  collectProtectedFiles,
  preparePublication
} from './publicationFiles.mjs';
import { publicationConfig } from './publicationConfig.mjs';

const execFileAsync = promisify(execFile);

export async function readPrivateKey({ privateKeyPath, privateKeyPem }) {
  if (privateKeyPem) {
    derivePublicKeyPem(privateKeyPem);
    return privateKeyPem;
  }
  if (!privateKeyPath) {
    throw new IntegrityError(
      'PRIVATE_KEY_INVALID',
      'Definí SIGNING_PRIVATE_KEY_PATH o SIGNING_PRIVATE_KEY_PEM para firmar.'
    );
  }
  let contents;
  try {
    contents = await fs.readFile(privateKeyPath, 'utf8');
  } catch (error) {
    throw new IntegrityError(
      'PRIVATE_KEY_INVALID',
      'No se pudo leer la clave privada configurada.',
      error
    );
  }
  derivePublicKeyPem(contents);
  return contents;
}

export async function createManifest({
  repoRoot,
  publicationRoot,
  publicKeyPem,
  createdAt = new Date().toISOString(),
  commit
}) {
  await preparePublication({ repoRoot, publicationRoot });
  const packageJson = await readJson(path.join(repoRoot, 'package.json'), 'package.json');
  const protectedFiles = await collectProtectedFiles(publicationRoot);
  const files = await hashPublicationFiles(publicationRoot, protectedFiles);
  const resolvedCommit = commit === undefined ? await detectCommit(repoRoot) : commit;

  const manifest = {
    formatVersion: 1,
    hashAlgorithm: HASH_ALGORITHM,
    signatureAlgorithm: SIGNATURE_ALGORITHM,
    projectId: publicationConfig.projectId,
    softwareId: publicationConfig.softwareId,
    licenseId: publicationConfig.licenseId,
    owner: publicationConfig.owner,
    developer: publicationConfig.developer,
    licensedTo: publicationConfig.licensedTo,
    version: packageJson.version,
    createdAt,
    commit: resolvedCommit || null,
    publicKeyFingerprint: publicKeyFingerprint(publicKeyPem),
    files
  };
  return manifest;
}

export async function writeManifest({ manifest, manifestPath }) {
  await fs.writeFile(manifestPath, serializeManifest(manifest), 'utf8');
}

export async function writeSignature({
  manifest,
  privateKeyPem,
  signaturePath
}) {
  const signature = signManifest(manifest, privateKeyPem);
  await fs.writeFile(signaturePath, signature + '\n', 'utf8');
  return signature;
}

export async function writePublicKey({ publicKeyPem, publicKeyPath }) {
  await fs.writeFile(publicKeyPath, publicKeyPem, {
    encoding: 'utf8',
    mode: 0o644
  });
}

export async function loadAndVerifyPublication({
  publicationRoot,
  manifestPath,
  signaturePath,
  publicKeyPath
}) {
  const [manifest, signature, publicKeyPem] = await Promise.all([
    readJson(manifestPath, 'el manifiesto'),
    readText(signaturePath, 'la firma'),
    readText(publicKeyPath, 'la clave pública')
  ]);
  const verification = await verifyPublication({
    publicationRoot,
    manifest,
    signature,
    publicKeyPem,
    expected: {
      projectId: publicationConfig.projectId,
      owner: publicationConfig.owner,
      developer: publicationConfig.developer,
      licensedTo: publicationConfig.licensedTo,
      softwareId: publicationConfig.softwareId,
      licenseId: publicationConfig.licenseId
    }
  });
  const actualProtectedFiles = await collectProtectedFiles(publicationRoot);
  const declaredProtectedFiles = manifest.files.map((file) => file.path).sort();
  if (
    actualProtectedFiles.length !== declaredProtectedFiles.length ||
    actualProtectedFiles.some(
      (filePath, index) => filePath !== declaredProtectedFiles[index]
    )
  ) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      'El manifiesto no describe todos los archivos regulares de la publicación.'
    );
  }
  return verification;
}

export async function createSignedPublication({
  repoRoot,
  publicationRoot,
  manifestPath,
  signaturePath,
  publicKeyPath,
  privateKeyPem,
  createdAt,
  commit,
  hooks = {}
}) {
  const publicKeyPem = derivePublicKeyPem(privateKeyPem);
  await hooks.beforePublicKeyWrite?.();
  await writePublicKey({ publicKeyPem, publicKeyPath });
  await hooks.beforeManifestCreation?.();
  const manifest = await createManifest({
    repoRoot,
    publicationRoot,
    publicKeyPem,
    createdAt,
    commit
  });
  await writeManifest({ manifest, manifestPath });
  await hooks.beforeSignatureWrite?.();
  await writeSignature({ manifest, privateKeyPem, signaturePath });
  await hooks.beforeVerification?.();
  const verification = await loadAndVerifyPublication({
    publicationRoot,
    manifestPath,
    signaturePath,
    publicKeyPath
  });
  return { manifest, verification };
}

export async function createTransactionalSignedPublication({
  repoRoot,
  publicationRoot,
  privateKeyPem,
  runBuild,
  createPublication = createSignedPublication,
  moveDirectory = renameWithRetry,
  createdAt,
  commit,
  hooks
}) {
  const validatedPrivateKey = await readPrivateKey({ privateKeyPem });
  const parent = path.dirname(publicationRoot);
  await fs.mkdir(parent, { recursive: true });
  const stagingRoot = await fs.mkdtemp(path.join(parent, '.signed-build-'));
  const backupRoot = `${publicationRoot}.previous-${path.basename(stagingRoot)}`;
  let originalMoved = false;
  let publicationMethod = 'atomic-rename';
  try {
    await runBuild(stagingRoot);
    await createPublication({
      repoRoot,
      publicationRoot: stagingRoot,
      manifestPath: path.join(stagingRoot, MANIFEST_FILE),
      signaturePath: path.join(stagingRoot, SIGNATURE_FILE),
      publicKeyPath: path.join(stagingRoot, PUBLIC_KEY_FILE),
      privateKeyPem: validatedPrivateKey,
      createdAt,
      commit,
      hooks
    });

    if (await exists(publicationRoot)) {
      await moveDirectory(publicationRoot, backupRoot);
      originalMoved = true;
    }
    try {
      await moveDirectory(stagingRoot, publicationRoot);
    } catch (error) {
      if (!originalMoved || !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)) {
        if (originalMoved) await restoreBackup(backupRoot, publicationRoot);
        originalMoved = false;
        throw error;
      }
      await replaceDirectoryByCopy({
        source: stagingRoot,
        destination: publicationRoot,
        backup: backupRoot
      });
      publicationMethod = 'copy-fallback';
    }
    if (originalMoved) {
      await fs.rm(backupRoot, { recursive: true, force: true });
      originalMoved = false;
    }
    const verification = await loadAndVerifyPublication({
      publicationRoot,
      manifestPath: path.join(publicationRoot, MANIFEST_FILE),
      signaturePath: path.join(publicationRoot, SIGNATURE_FILE),
      publicKeyPath: path.join(publicationRoot, PUBLIC_KEY_FILE)
    });
    return { ...verification, publicationMethod };
  } finally {
    await fs.rm(stagingRoot, { recursive: true, force: true });
    if (originalMoved && !await exists(publicationRoot) && await exists(backupRoot)) {
      await restoreBackup(backupRoot, publicationRoot);
    }
  }
}

export async function detectCommit(repoRoot) {
  if (process.env.BUILD_COMMIT) return process.env.BUILD_COMMIT;
  try {
    const gitRepositoryRoot = await findGitRepositoryRoot(repoRoot);
    if (!gitRepositoryRoot) return null;
    const { stdout } = await execFileAsync(
      'git',
      ['-c', `safe.directory=${gitRepositoryRoot}`, 'rev-parse', 'HEAD'],
      { cwd: repoRoot }
    );
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function findGitRepositoryRoot(startPath) {
  let candidate = path.resolve(startPath);
  while (true) {
    if (await exists(path.join(candidate, '.git'))) return candidate;
    const parent = path.dirname(candidate);
    if (parent === candidate) return null;
    candidate = parent;
  }
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function renameWithRetry(source, destination) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(source, destination);
      return;
    } catch (error) {
      if (
        attempt >= 9 ||
        !['EPERM', 'EBUSY', 'EACCES'].includes(error.code)
      ) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * (attempt + 1)));
    }
  }
}

async function replaceDirectoryByCopy({ source, destination, backup }) {
  try {
    await fs.rm(destination, { recursive: true, force: true });
    await fs.cp(source, destination, {
      recursive: true,
      force: true,
      errorOnExist: false
    });
  } catch (error) {
    await restoreBackup(backup, destination);
    throw error;
  }
}

async function restoreBackup(backup, destination) {
  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(backup, destination, {
    recursive: true,
    force: true,
    errorOnExist: false
  });
}

export function manifestCanonicalBytes(manifest) {
  return Buffer.from(canonicalize(manifest), 'utf8');
}

export const publicationArtifactNames = Object.freeze({
  publicKey: PUBLIC_KEY_FILE,
  signature: SIGNATURE_FILE
});
