import fs from 'node:fs/promises';
import path from 'node:path';
import {
  IntegrityError,
  MANIFEST_FILE,
  SIGNATURE_FILE,
  normalizePublicationPath
} from './integrityCore.mjs';

const EXCLUDED_FILES = new Set([MANIFEST_FILE, SIGNATURE_FILE]);

export async function preparePublication({ repoRoot, publicationRoot }) {
  await fs.mkdir(path.join(publicationRoot, 'generated'), { recursive: true });
  await fs.copyFile(
    path.join(repoRoot, 'generated', 'catalog.json'),
    path.join(publicationRoot, 'generated', 'catalog.json')
  );
  await fs.copyFile(
    path.join(repoRoot, 'NOTICE'),
    path.join(publicationRoot, 'NOTICE')
  );
}

export async function collectProtectedFiles(publicationRoot) {
  const absoluteRoot = path.resolve(publicationRoot);
  let realRoot;
  try {
    realRoot = await fs.realpath(absoluteRoot);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new IntegrityError('FILE_MISSING', 'No existe publicationRoot.', error);
    }
    throw error;
  }

  const files = [];
  const visitedDirectories = new Set();
  await walkDirectory(absoluteRoot, '', realRoot, visitedDirectories, files);
  return Array.from(new Set(files)).sort();
}

async function walkDirectory(
  directoryPath,
  relativeDirectory,
  realRoot,
  visitedDirectories,
  files
) {
  const realDirectory = await fs.realpath(directoryPath);
  assertRealPathInsideRoot(realRoot, realDirectory, relativeDirectory || '.');
  const directoryKey = normalizeFilesystemIdentity(realDirectory);
  if (visitedDirectories.has(directoryKey)) return;
  visitedDirectories.add(directoryKey);

  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));

  for (const entry of entries) {
    const relativePath = relativeDirectory
      ? `${relativeDirectory}/${entry.name}`
      : entry.name;
    const safePath = normalizePublicationPath(relativePath);
    if (!relativeDirectory && EXCLUDED_FILES.has(safePath)) continue;

    const entryPath = path.join(directoryPath, entry.name);
    const realEntry = await fs.realpath(entryPath);
    assertRealPathInsideRoot(realRoot, realEntry, safePath);
    const stats = await fs.stat(entryPath);
    if (stats.isDirectory()) {
      await walkDirectory(
        entryPath,
        safePath,
        realRoot,
        visitedDirectories,
        files
      );
    } else if (stats.isFile()) {
      files.push(safePath);
    }
  }
}

function assertRealPathInsideRoot(realRoot, realPath, relativePath) {
  const relative = path.relative(realRoot, realPath);
  if (
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new IntegrityError(
      'MANIFEST_INVALID',
      `La ruta publicada escapa de publicationRoot: ${relativePath}`
    );
  }
}

function normalizeFilesystemIdentity(filePath) {
  return process.platform === 'win32' ? filePath.toLowerCase() : filePath;
}
