import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import {
  getProductImageDerivativePath
} from '../src/data/productImageDerivativePaths.js';

export const DERIVATIVE_CONFIG = Object.freeze([
  Object.freeze({ width: 200, quality: 80 }),
  Object.freeze({ width: 480, quality: 82 }),
  Object.freeze({ width: 800, quality: 84 })
]);

const MANIFEST_SCHEMA_VERSION = 1;
const PROCESSOR_VERSION = 2;
const defaultRepoRoot = fileURLToPath(new URL('../', import.meta.url));

async function collectReferencedImagePaths(repoRoot) {
  const catalogPath = path.join(repoRoot, 'generated', 'catalog.json');
  const catalog = JSON.parse(await fs.readFile(catalogPath, 'utf8'));
  const paths = new Set();
  for (const product of catalog.products || []) {
    for (const image of product.images || []) paths.add(image);
    for (const variant of product.variants || []) {
      if (variant.thumbnail) paths.add(variant.thumbnail);
      for (const image of variant.images || []) paths.add(image);
    }
  }
  return [...paths]
    .sort((left, right) => left.localeCompare(right, 'en'))
    .map((relativePath) => path.join(repoRoot, ...relativePath.split('/')));
}

async function readPreviousManifest(manifestPath) {
  try {
    const parsed = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    return parsed.schemaVersion === MANIFEST_SCHEMA_VERSION &&
      parsed.processorVersion === PROCESSOR_VERSION
      ? parsed
      : null;
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
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

async function writeWebpSafely(sourcePath, outputPath, width, quality) {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  try {
    await sharp(sourcePath)
      .rotate()
      .resize({
        width,
        withoutEnlargement: true
      })
      .webp({ quality, effort: 4 })
      .toFile(temporaryPath);
    await fs.rm(outputPath, { force: true });
    await fs.rename(temporaryPath, outputPath);
  } catch (error) {
    await fs.rm(temporaryPath, { force: true });
    throw error;
  }
}

async function removeStaleFiles(directory, expectedPaths) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }
  let removed = 0;
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      removed += await removeStaleFiles(entryPath, expectedPaths);
      if ((await fs.readdir(entryPath)).length === 0) await fs.rmdir(entryPath);
    } else if (entry.isFile() && !expectedPaths.has(path.resolve(entryPath))) {
      await fs.rm(entryPath, { force: true });
      removed += 1;
    }
  }
  return removed;
}

export async function generateProductImages({ repoRoot = defaultRepoRoot } = {}) {
  const outputRoot = path.join(repoRoot, 'public', 'product-images');
  const manifestPath = path.join(repoRoot, 'generated', 'product-image-derivatives.json');
  const cachePath = path.join(repoRoot, 'generated', '.product-image-derivatives-cache.json');
  const previousManifest = await readPreviousManifest(cachePath);
  const sourcePaths = await collectReferencedImagePaths(repoRoot);
  const expectedOutputs = new Set();
  const images = {};
  const cacheImages = {};
  let generated = 0;
  let skipped = 0;

  for (const sourceAbsolutePath of sourcePaths) {
    const sourcePath = path.relative(repoRoot, sourceAbsolutePath).replaceAll(path.sep, '/');
    const contents = await fs.readFile(sourceAbsolutePath);
    const hash = createHash('sha256').update(contents).digest('hex');
    const metadata = await sharp(contents).metadata();
    const width = metadata.autoOrient?.width ?? metadata.width;
    const height = metadata.autoOrient?.height ?? metadata.height;
    if (!width || !height) throw new Error(`No se pudieron leer dimensiones: ${sourcePath}`);

    const variants = {};
    for (const config of DERIVATIVE_CONFIG) {
      if (width <= config.width) continue;
      const relativeOutputPath = getProductImageDerivativePath(sourcePath, config.width);
      const absoluteOutputPath = path.join(repoRoot, 'public', ...relativeOutputPath.split('/'));
      expectedOutputs.add(path.resolve(absoluteOutputPath));
      variants[config.width] = relativeOutputPath;
      const previous = previousManifest?.images?.[sourcePath];
      const isCurrent =
        previous?.sha256 === hash &&
        previous?.variants?.[config.width] === relativeOutputPath &&
        await exists(absoluteOutputPath);
      if (isCurrent) {
        skipped += 1;
      } else {
        await writeWebpSafely(
          sourceAbsolutePath,
          absoluteOutputPath,
          config.width,
          config.quality
        );
        generated += 1;
      }
    }

    images[sourcePath] = { sha256: hash.slice(0, 16), width, height };
    cacheImages[sourcePath] = { sha256: hash, variants };
  }

  const staleRemoved = await removeStaleFiles(outputRoot, expectedOutputs);
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    format: 'webp',
    widths: DERIVATIVE_CONFIG.map(({ width, quality }) => ({ width, quality })),
    images
  };
  const manifestContents = JSON.stringify(manifest, null, 2) + '\n';
  const cacheManifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    processorVersion: PROCESSOR_VERSION,
    images: cacheImages
  };
  const cacheContents = JSON.stringify(cacheManifest, null, 2) + '\n';
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const currentManifest = await fs.readFile(manifestPath, 'utf8').catch(() => null);
  if (currentManifest !== manifestContents) {
    await fs.writeFile(manifestPath, manifestContents, 'utf8');
  }
  const currentCache = await fs.readFile(cachePath, 'utf8').catch(() => null);
  if (currentCache !== cacheContents) {
    await fs.writeFile(cachePath, cacheContents, 'utf8');
  }

  return {
    sources: sourcePaths.length,
    derivatives: expectedOutputs.size,
    generated,
    skipped,
    staleRemoved,
    manifestPath,
    outputRoot
  };
}

async function main() {
  const result = await generateProductImages();
  console.log(
    `Imágenes de producto: ${result.sources} originales, ` +
    `${result.derivatives} derivados (${result.generated} generados, ` +
    `${result.skipped} reutilizados, ${result.staleRemoved} obsoletos eliminados).`
  );
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) await main();
