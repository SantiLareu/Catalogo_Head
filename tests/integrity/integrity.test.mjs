import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  IntegrityError,
  canonicalize,
  decodeStrictEd25519Signature,
  normalizePublicationPath,
  resolveProtectedFile,
  resolveProtectedPath,
  validateManifest,
  verifyManifestSignature,
  verifyPublication
} from '../../scripts/integrity/integrityCore.mjs';
import { collectProtectedFiles } from '../../scripts/integrity/publicationFiles.mjs';
import {
  manifestPath as defaultManifestPath,
  publicKeyPath as defaultPublicKeyPath,
  repoRoot,
  signaturePath as defaultSignaturePath
} from '../../scripts/integrity/paths.mjs';
import {
  createSignedPublication,
  createTransactionalSignedPublication,
  loadAndVerifyPublication
} from '../../scripts/integrity/releaseOperations.mjs';

async function createFixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-integrity-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const publicationRoot = path.join(directory, 'dist');
  const secretRoot = path.join(directory, 'secrets');
  await fs.mkdir(path.join(publicationRoot, 'assets'), { recursive: true });
  await fs.mkdir(secretRoot, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(publicationRoot, 'index.html'),
      '<script type="module" src="./assets/app.js"></script>\n'
    ),
    fs.writeFile(path.join(publicationRoot, 'assets', 'app.js'), 'console.log("app");\n'),
    fs.copyFile(
      path.join(repoRoot, 'public', 'ownership.json'),
      path.join(publicationRoot, 'ownership.json')
    ),
    fs.copyFile(
      path.join(repoRoot, 'public', '_headers'),
      path.join(publicationRoot, '_headers')
    )
  ]);
  const { privateKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  const manifestPath = path.join(publicationRoot, 'integrity-manifest.json');
  const signaturePath = path.join(publicationRoot, 'integrity-manifest.sig');
  const publicKeyPath = path.join(publicationRoot, 'signing-public-key.pem');
  await fs.writeFile(path.join(secretRoot, 'identity.pem'), privateKeyPem);
  const signed = await createSignedPublication({
    repoRoot,
    publicationRoot,
    manifestPath,
    signaturePath,
    publicKeyPath,
    privateKeyPem,
    createdAt: '2026-07-30T00:00:00.000Z',
    commit: null
  });
  return {
    publicationRoot,
    secretRoot,
    manifestPath,
    signaturePath,
    publicKeyPath,
    manifest: signed.manifest
  };
}

test('firma válida verifica identidad, licencia y archivos', async (t) => {
  const fixture = await createFixture(t);
  const result = await loadAndVerifyPublication(fixture);
  assert.equal(result.verified, true);
  assert.equal(result.projectId, 'realstep-head-catalog');
  assert.equal(result.softwareId, 'santiago-lareu-catalog-engine');
  assert.equal(result.licenseId, 'SLCE-LIC-2026-0001');
});

test('catálogo alterado invalida el hash', async (t) => {
  const fixture = await createFixture(t);
  await fs.appendFile(
    path.join(fixture.publicationRoot, 'generated', 'catalog.json'),
    '\n'
  );
  await assert.rejects(
    loadAndVerifyPublication(fixture),
    (error) => error instanceof IntegrityError && error.code === 'HASH_MISMATCH'
  );
});

test('manifiesto alterado invalida la firma', async (t) => {
  const fixture = await createFixture(t);
  const manifest = JSON.parse(await fs.readFile(fixture.manifestPath, 'utf8'));
  manifest.version = 'alterada';
  await fs.writeFile(fixture.manifestPath, JSON.stringify(manifest));
  await assert.rejects(
    loadAndVerifyPublication(fixture),
    (error) => error instanceof IntegrityError && error.code === 'SIGNATURE_INVALID'
  );
});

test('firma alterada es rechazada', async (t) => {
  const fixture = await createFixture(t);
  const signature = await fs.readFile(fixture.signaturePath, 'utf8');
  const replacement = signature[0] === 'A' ? 'B' : 'A';
  await fs.writeFile(fixture.signaturePath, replacement + signature.slice(1));
  await assert.rejects(
    loadAndVerifyPublication(fixture),
    (error) => error instanceof IntegrityError && error.code === 'SIGNATURE_INVALID'
  );
});

test('clave pública distinta es rechazada por fingerprint', async (t) => {
  const fixture = await createFixture(t);
  const { publicKey } = generateKeyPairSync('ed25519');
  await fs.writeFile(
    fixture.publicKeyPath,
    publicKey.export({ type: 'spki', format: 'pem' })
  );
  await assert.rejects(
    loadAndVerifyPublication(fixture),
    (error) => error instanceof IntegrityError && error.code === 'PUBLIC_KEY_INVALID'
  );
});

test('archivo protegido inexistente produce error específico', async (t) => {
  const fixture = await createFixture(t);
  await fs.rm(path.join(fixture.publicationRoot, 'ownership.json'));
  await assert.rejects(
    loadAndVerifyPublication(fixture),
    (error) => error instanceof IntegrityError && error.code === 'FILE_MISSING'
  );
});

test('archivo regular no declarado invalida una publicación parcial', async (t) => {
  const fixture = await createFixture(t);
  await fs.writeFile(
    path.join(fixture.publicationRoot, 'asset-agregado-despues.txt'),
    'no declarado'
  );
  await assert.rejects(
    loadAndVerifyPublication(fixture),
    (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
  );
});

test('artefactos de integridad ausentes producen FILE_MISSING', async (t) => {
  for (const artifact of ['manifestPath', 'signaturePath', 'publicKeyPath']) {
    const fixture = await createFixture(t);
    await fs.rm(fixture[artifact]);
    await assert.rejects(
      loadAndVerifyPublication(fixture),
      (error) => error instanceof IntegrityError && error.code === 'FILE_MISSING',
      artifact
    );
  }
});

test('recorrido protege recursivamente todos los archivos regulares', async (t) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-collect-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'assets', 'chunks'), { recursive: true });
  await fs.mkdir(path.join(root, 'fonts'), { recursive: true });
  await fs.mkdir(path.join(root, 'empty'), { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(root, 'index.html'), '<html></html>'),
    fs.writeFile(path.join(root, 'assets', 'unused image.png'), 'image'),
    fs.writeFile(path.join(root, 'assets', 'chunks', 'extra.js'), 'chunk'),
    fs.writeFile(path.join(root, 'fonts', 'Head Sans.woff2'), 'font'),
    fs.writeFile(path.join(root, 'signing-public-key.pem'), 'public'),
    fs.writeFile(path.join(root, 'integrity-manifest.json'), '{}'),
    fs.writeFile(path.join(root, 'integrity-manifest.sig'), 'signature')
  ]);
  assert.deepEqual(await collectProtectedFiles(root), [
    'assets/chunks/extra.js',
    'assets/unused image.png',
    'fonts/Head Sans.woff2',
    'index.html',
    'signing-public-key.pem'
  ]);
});

test('recorrido rechaza enlaces externos y evita ciclos internos', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-walk-links-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'site');
  const outside = path.join(directory, 'outside');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.writeFile(path.join(root, 'inside.txt'), 'inside');
  await fs.writeFile(path.join(outside, 'outside.txt'), 'outside');
  try {
    await fs.symlink(outside, path.join(root, 'external'), 'junction');
  } catch (error) {
    if (error.code === 'EPERM') {
      t.skip('El entorno no permite crear junctions.');
      return;
    }
    throw error;
  }
  await assert.rejects(
    collectProtectedFiles(root),
    (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
  );
});

test('serialización canónica es determinista', () => {
  const first = { z: 1, a: { y: 2, x: [3, { b: 4, a: 5 }] } };
  const second = { a: { x: [3, { a: 5, b: 4 }], y: 2 }, z: 1 };
  assert.equal(canonicalize(first), canonicalize(second));
  assert.equal(
    canonicalize({ array: [true, null, 2, 'texto'], nested: { b: 2, a: 1 } }),
    '{"array":[true,null,2,"texto"],"nested":{"a":1,"b":2}}'
  );
});

test('canonicalize rechaza valores no representables en JSON', () => {
  const invalidValues = [
    undefined,
    1n,
    NaN,
    Infinity,
    -Infinity,
    function invalid() {},
    Symbol('invalid'),
    { invalid: undefined },
    [undefined],
    new Date('2026-07-30T00:00:00.000Z')
  ];
  for (const value of invalidValues) {
    assert.throws(
      () => canonicalize(value),
      (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
    );
  }
});

test('Base64 de firma exige sintaxis estricta y exactamente 64 bytes', async (t) => {
  const fixture = await createFixture(t);
  const [signature, publicKeyPem] = await Promise.all([
    fs.readFile(fixture.signaturePath, 'utf8'),
    fs.readFile(fixture.publicKeyPath, 'utf8')
  ]);
  assert.equal(decodeStrictEd25519Signature(signature).length, 64);
  verifyManifestSignature(fixture.manifest, signature, publicKeyPem);

  const normalized = signature.trim();
  const invalidSignatures = [
    normalized.slice(0, 10) + '!' + normalized.slice(11),
    normalized.slice(0, 10) + ' ' + normalized.slice(10),
    normalized.slice(0, -1),
    normalized.slice(0, -4),
    Buffer.alloc(32).toString('base64')
  ];
  for (const invalidSignature of invalidSignatures) {
    assert.throws(
      () => decodeStrictEd25519Signature(invalidSignature),
      (error) => error instanceof IntegrityError && error.code === 'SIGNATURE_INVALID'
    );
  }
});

test('createdAt exige el formato UTC exacto de toISOString', () => {
  const manifest = validManifest();
  validateManifest(manifest);
  const invalidDates = [
    'texto',
    '2026-02-30T21:30:00.000Z',
    '2026-07-30T21:30:00.000',
    '2026-07-30T18:30:00.000-03:00',
    '2026-07-30T21:30:00Z',
    ''
  ];
  for (const createdAt of invalidDates) {
    assert.throws(
      () => validateManifest({ ...manifest, createdAt }),
      (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
    );
  }
});

test('commit y fingerprint cumplen el contrato formal v1', () => {
  const manifest = validManifest();
  for (const commit of [null, 'a'.repeat(40), 'release_2026.07-abc']) {
    validateManifest({ ...manifest, commit });
  }
  for (const commit of ['', 'short', 'a'.repeat(129), 'con espacio', 'abc/def', undefined]) {
    assert.throws(
      () => validateManifest({ ...manifest, commit }),
      (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
    );
  }
  for (const publicKeyFingerprint of [
    'SHA256:invalido',
    `SHA256:${'A'.repeat(42)}=`,
    `sha256:${'A'.repeat(43)}`,
    `SHA256:${'+'.repeat(43)}`
  ]) {
    assert.throws(
      () => validateManifest({ ...manifest, publicKeyFingerprint }),
      (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
    );
  }
});

test('clave privada inválida falla antes de ejecutar el build transaccional', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-early-key-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  let buildExecuted = false;
  await assert.rejects(
    createTransactionalSignedPublication({
      repoRoot,
      publicationRoot: path.join(directory, 'dist'),
      privateKeyPem: 'no-es-una-clave',
      runBuild: async () => { buildExecuted = true; }
    }),
    (error) => error instanceof IntegrityError && error.code === 'PRIVATE_KEY_INVALID'
  );
  assert.equal(buildExecuted, false);
});

test('fallos de cada etapa no reemplazan un dist válido previo', async (t) => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  for (const hookName of [
    'beforePublicKeyWrite',
    'beforeManifestCreation',
    'beforeSignatureWrite',
    'beforeVerification'
  ]) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), `realstep-transaction-${hookName}-`));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const finalRoot = path.join(directory, 'dist');
    await fs.mkdir(finalRoot);
    await fs.writeFile(path.join(finalRoot, 'previous.txt'), 'publicación anterior');
    await assert.rejects(
      createTransactionalSignedPublication({
        repoRoot,
        publicationRoot: finalRoot,
        privateKeyPem,
        commit: null,
        createdAt: '2026-07-30T00:00:00.000Z',
        runBuild: async (stagingRoot) => {
          await fs.mkdir(path.join(stagingRoot, 'assets'), { recursive: true });
          await fs.writeFile(path.join(stagingRoot, 'index.html'), '<html></html>');
          await fs.writeFile(path.join(stagingRoot, 'asset.txt'), 'asset');
        },
        hooks: {
          [hookName]: async () => { throw new Error(`fallo ${hookName}`); }
        }
      })
    );
    assert.equal(
      await fs.readFile(path.join(finalRoot, 'previous.txt'), 'utf8'),
      'publicación anterior'
    );
    assert.equal(
      await fs.access(path.join(finalRoot, 'integrity-manifest.json'))
        .then(() => true, () => false),
      false
    );
  }
});

test('la publicación transaccional informa rename atómico y fallback por copia', async (t) => {
  const { privateKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  for (const expectedMethod of ['atomic-rename', 'copy-fallback']) {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), `realstep-${expectedMethod}-`));
    t.after(() => fs.rm(directory, { recursive: true, force: true }));
    const finalRoot = path.join(directory, 'dist');
    await fs.mkdir(finalRoot);
    await fs.writeFile(path.join(finalRoot, 'previous.txt'), 'publicación anterior');
    let moveCount = 0;
    const result = await createTransactionalSignedPublication({
      repoRoot,
      publicationRoot: finalRoot,
      privateKeyPem,
      commit: null,
      createdAt: '2026-07-30T00:00:00.000Z',
      runBuild: async (stagingRoot) => {
        await fs.mkdir(path.join(stagingRoot, 'assets'), { recursive: true });
        await fs.writeFile(path.join(stagingRoot, 'index.html'), '<html></html>');
        await fs.writeFile(path.join(stagingRoot, 'asset.txt'), 'asset');
      },
      moveDirectory: async (source, destination) => {
        moveCount += 1;
        if (expectedMethod === 'copy-fallback' && moveCount === 2) {
          const error = new Error('bloqueo simulado durante la promoción');
          error.code = 'EBUSY';
          throw error;
        }
        await fs.rename(source, destination);
      }
    });

    assert.equal(result.publicationMethod, expectedMethod);
    assert.equal(await fs.readFile(path.join(finalRoot, 'asset.txt'), 'utf8'), 'asset');
    assert.equal(await fs.access(path.join(finalRoot, 'previous.txt')).then(
      () => true,
      () => false
    ), false);
  }
});

test('rutas protegidas quedan confinadas dentro de publicationRoot', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-paths-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'site');
  await fs.mkdir(path.join(root, 'subdir'), { recursive: true });
  await fs.writeFile(path.join(root, 'subdir', 'file.json'), '{}');

  assert.equal(normalizePublicationPath('subdir/file.json'), 'subdir/file.json');
  assert.equal(
    resolveProtectedPath(root, 'subdir/file.json'),
    path.resolve(root, 'subdir', 'file.json')
  );
  assert.equal(
    await resolveProtectedFile(root, 'subdir/file.json'),
    await fs.realpath(path.join(root, 'subdir', 'file.json'))
  );

  const invalidPaths = [
    '../archivo',
    'subdir/../../archivo',
    '/tmp/archivo',
    'C:\\archivo',
    '\\\\servidor\\recurso',
    'archivo\0.json',
    'subdir/./file.json',
    'subdir//file.json'
  ];
  for (const invalidPath of invalidPaths) {
    assert.throws(
      () => resolveProtectedPath(root, invalidPath),
      (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
    );
  }
  assert.throws(
    () => resolveProtectedPath(root, '../site-malicioso/archivo'),
    (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
  );
});

test('realpath rechaza un enlace que sale de publicationRoot', async (t) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'realstep-symlink-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'site');
  const outside = path.join(directory, 'outside');
  await fs.mkdir(root);
  await fs.mkdir(outside);
  await fs.writeFile(path.join(outside, 'file.json'), '{}');
  try {
    await fs.symlink(outside, path.join(root, 'link'), 'junction');
  } catch (error) {
    if (error.code === 'EPERM') {
      t.skip('El entorno no permite crear junctions para esta prueba.');
      return;
    }
    throw error;
  }
  await assert.rejects(
    resolveProtectedFile(root, 'link/file.json'),
    (error) => error instanceof IntegrityError && error.code === 'MANIFEST_INVALID'
  );
});

test('la publicación firmada nunca contiene la clave privada', async (t) => {
  const fixture = await createFixture(t);
  const privateMarker = 'BEGIN ' + 'PRIVATE KEY';
  const files = await listFiles(fixture.publicationRoot);
  for (const filePath of files) {
    const contents = await fs.readFile(filePath);
    assert.equal(contents.includes(Buffer.from(privateMarker)), false, filePath);
  }
  assert.ok((await listFiles(fixture.secretRoot)).length > 0);
});

test('Git no rastrea claves privadas ni artefactos locales de firma', async () => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const { stdout } = await promisify(execFile)(
    'git',
    ['-c', `safe.directory=${path.dirname(repoRoot)}`, 'ls-files'],
    { cwd: repoRoot }
  );
  const tracked = stdout.split(/\r?\n/).filter(Boolean);
  assert.equal(
    tracked.some((filePath) =>
      filePath.includes('.signing/') ||
      /(?:private|secret).*\.pem$/i.test(filePath)
    ),
    false
  );
  assert.notEqual(defaultManifestPath, defaultSignaturePath);
  assert.notEqual(defaultPublicKeyPath, defaultSignaturePath);
});

async function listFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  }));
  return nested.flat();
}

function validManifest() {
  return {
    formatVersion: 1,
    hashAlgorithm: 'SHA-256',
    signatureAlgorithm: 'Ed25519',
    projectId: 'realstep-head-catalog',
    owner: 'Santiago Lareu',
    developer: 'Santiago Lareu',
    licensedTo: 'RealStep',
    softwareId: 'santiago-lareu-catalog-engine',
    licenseId: 'SLCE-LIC-2026-0001',
    version: '1.1.3',
    createdAt: '2026-07-30T21:30:00.000Z',
    commit: null,
    publicKeyFingerprint: `SHA256:${'A'.repeat(43)}`,
    files: [{
      path: 'ownership.json',
      sha256: 'a'.repeat(64),
      size: 1
    }]
  };
}
