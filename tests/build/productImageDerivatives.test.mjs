import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import sharp from 'sharp';
import {
  generateProductImages
} from '../../scripts/generate-product-images.mjs';
import {
  getProductImageDerivativePath
} from '../../src/data/productImageDerivativePaths.js';

async function createFixtureRoot() {
  const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-product-images-'));
  const imagePath = path.join(repoRoot, 'assets', 'products', 'sample', 'shoe.JPG');
  await fs.mkdir(path.dirname(imagePath), { recursive: true });
  await fs.mkdir(path.join(repoRoot, 'generated'), { recursive: true });
  await sharp({
    create: { width: 1000, height: 750, channels: 3, background: '#cc2222' }
  }).jpeg({ quality: 90 }).toFile(imagePath);
  await fs.writeFile(
    path.join(repoRoot, 'generated', 'catalog.json'),
    JSON.stringify({
      products: [{
        images: ['assets/products/sample/shoe.JPG'],
        variants: []
      }]
    }),
    'utf8'
  );
  return { repoRoot, imagePath };
}

test('las rutas derivadas son deterministas y conservan path y extensión original', () => {
  assert.equal(
    getProductImageDerivativePath('assets/products/paletas/modelo uno.JPG', 200),
    'product-images/paletas/modelo uno.JPG.w200.webp'
  );
  assert.throws(
    () => getProductImageDerivativePath('../fuera.jpg', 200),
    /Ruta de imagen de producto inválida/
  );
});

test('genera una vez, reutiliza por SHA-256 y regenera cuando cambia el original', async () => {
  const fixture = await createFixtureRoot();
  try {
    const first = await generateProductImages({ repoRoot: fixture.repoRoot });
    assert.equal(first.sources, 1);
    assert.equal(first.derivatives, 3);
    assert.equal(first.generated, 3);

    const second = await generateProductImages({ repoRoot: fixture.repoRoot });
    assert.equal(second.generated, 0);
    assert.equal(second.skipped, 3);

    const manifestPath = path.join(
      fixture.repoRoot,
      'generated',
      'product-image-derivatives.json'
    );
    const before = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    await fs.rm(fixture.imagePath);
    await sharp({
      create: { width: 1000, height: 750, channels: 3, background: '#111111' }
    }).jpeg({ quality: 90 }).toFile(fixture.imagePath);
    const third = await generateProductImages({ repoRoot: fixture.repoRoot });
    const after = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    assert.equal(third.generated, 3);
    assert.notEqual(
      before.images['assets/products/sample/shoe.JPG'].sha256,
      after.images['assets/products/sample/shoe.JPG'].sha256
    );
    assert.doesNotMatch(JSON.stringify(after), /generatedAt|timestamp/i);
  } finally {
    await fs.rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('no amplía originales que ya caben dentro de un tamaño derivado', async () => {
  const fixture = await createFixtureRoot();
  try {
    await fs.rm(fixture.imagePath);
    await sharp({
      create: { width: 180, height: 120, channels: 3, background: '#ffffff' }
    }).png().toFile(fixture.imagePath);
    const result = await generateProductImages({ repoRoot: fixture.repoRoot });
    assert.equal(result.derivatives, 0);
    assert.equal(result.generated, 0);
  } finally {
    await fs.rm(fixture.repoRoot, { recursive: true, force: true });
  }
});

test('verify:build exige que todos los derivados del manifiesto existan en dist', async () => {
  const verifier = await fs.readFile(
    new URL('../../scripts/verify-build.mjs', import.meta.url),
    'utf8'
  );
  assert.match(verifier, /product-image-derivatives\.json/);
  assert.match(verifier, /missingDerivatives/);
  assert.match(verifier, /derivados responsive esperados/);
});
