import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const APP_SOURCE_DIRECTORIES = ['assets', 'public', 'src'];
const APP_SOURCE_FILES = [
  'index.html',
  'package-lock.json',
  'package.json',
  'vite.config.js'
];

export async function createAppVersion(repoRoot) {
  const files = [];
  for (const directory of APP_SOURCE_DIRECTORIES) {
    await collectFiles(path.join(repoRoot, directory), repoRoot, files);
  }
  for (const file of APP_SOURCE_FILES) {
    files.push(file);
  }
  files.sort();

  const hash = createHash('sha256');
  for (const relativePath of files) {
    const contents = await fs.readFile(path.join(repoRoot, relativePath));
    hash.update(relativePath.replaceAll(path.sep, '/'));
    hash.update('\0');
    hash.update(contents);
    hash.update('\0');
  }
  return 'sha256-' + hash.digest('hex');
}

async function collectFiles(directory, repoRoot, files) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name, 'en'));
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(entryPath, repoRoot, files);
    } else if (entry.isFile()) {
      files.push(path.relative(repoRoot, entryPath));
    }
  }
}
