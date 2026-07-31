import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import { companyConfig } from '../src/config/company.js';
import {
  canonicalize as canonicalizeReact,
  isManifestValid,
  pemToBytes,
  resolveProtectedUrl,
  verifyPublishedIntegrity
} from '../src/security/integrityVerifier.js';
import {
  canonicalize as canonicalizeNode,
  publicKeyFingerprint,
  sha256,
  signManifest
} from '../../scripts/integrity/integrityCore.mjs';

function createBrowserFixture() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const ownership = Buffer.from('{"owner":"Santiago Lareu"}\n');
  const manifest = {
    formatVersion: 1,
    hashAlgorithm: 'SHA-256',
    signatureAlgorithm: 'Ed25519',
    projectId: companyConfig.ownership.projectId,
    owner: companyConfig.ownership.owner,
    developer: companyConfig.ownership.developer,
    licensedTo: companyConfig.license.licensedTo,
    softwareId: companyConfig.software.softwareId,
    licenseId: companyConfig.license.licenseId,
    version: '1.1.3',
    createdAt: '2026-07-30T00:00:00.000Z',
    commit: null,
    publicKeyFingerprint: publicKeyFingerprint(publicKeyPem),
    files: [{
      path: 'ownership.json',
      sha256: sha256(ownership),
      size: ownership.length
    }]
  };
  const resources = new Map([
    ['/integrity-manifest.json', JSON.stringify(manifest)],
    ['/integrity-manifest.sig', signManifest(manifest, privateKeyPem)],
    ['/signing-public-key.pem', publicKeyPem],
    ['/ownership.json', ownership]
  ]);
  return { manifest, privateKeyPem, publicKeyPem, resources };
}

function resign(fixture) {
  fixture.resources.set(
    '/integrity-manifest.json',
    JSON.stringify(fixture.manifest)
  );
  fixture.resources.set(
    '/integrity-manifest.sig',
    signManifest(fixture.manifest, fixture.privateKeyPem)
  );
}

function createFetch(resources, { forcedStatus, calls = [] } = {}) {
  return async (url, options) => {
    calls.push({ url: new URL(url), options });
    if (forcedStatus) return new Response(null, { status: forcedStatus });
    const value = resources.get(new URL(url).pathname);
    if (value === undefined) return new Response(null, { status: 404 });
    return new Response(value, { status: 200 });
  };
}

async function verifyFixture(fixture, fetchImpl = createFetch(fixture.resources)) {
  return verifyPublishedIntegrity(companyConfig, {
    fetchImpl,
    baseUrl: new URL('https://catalog.example/')
  });
}

test('verificador React clasifica verified y usa no-store en todas las solicitudes', async () => {
  const fixture = createBrowserFixture();
  const calls = [];
  assert.equal(
    await verifyFixture(fixture, createFetch(fixture.resources, { calls })),
    'verified'
  );
  assert.equal(calls.length, 4);
  assert.ok(calls.every((call) => call.options?.cache === 'no-store'));
});

test('solo la ausencia de los tres artefactos devuelve unavailable', async () => {
  assert.equal(
    await verifyPublishedIntegrity(companyConfig, {
      fetchImpl: createFetch(new Map()),
      baseUrl: new URL('https://catalog.example/')
    }),
    'unavailable'
  );
  assert.equal(
    await verifyPublishedIntegrity(companyConfig, {
      fetchImpl: createFetch(new Map()),
      cryptoImpl: {},
      baseUrl: new URL('https://catalog.example/')
    }),
    'unavailable'
  );
});

test('todas las combinaciones parciales de artefactos devuelven invalid', async () => {
  const fixture = createBrowserFixture();
  const artifactPaths = [
    '/integrity-manifest.json',
    '/integrity-manifest.sig',
    '/signing-public-key.pem'
  ];
  for (let mask = 1; mask < 7; mask += 1) {
    const resources = new Map(fixture.resources);
    artifactPaths.forEach((artifact, index) => {
      if ((mask & (1 << index)) === 0) resources.delete(artifact);
    });
    assert.equal(
      await verifyFixture(fixture, createFetch(resources)),
      'invalid',
      `combinación ${mask}`
    );
  }
});

test('errores HTTP y de red se clasifican como error', async () => {
  const fixture = createBrowserFixture();
  assert.equal(
    await verifyFixture(fixture, createFetch(new Map(), { forcedStatus: 500 })),
    'error'
  );
  assert.equal(
    await verifyFixture(fixture, async () => {
      throw new Error('red interrumpida');
    }),
    'error'
  );
});

test('contenido alterado, JSON, firma y PEM malformados son invalid', async () => {
  const altered = createBrowserFixture();
  altered.resources.set('/ownership.json', '{"owner":"otro"}\n');
  assert.equal(await verifyFixture(altered), 'invalid');

  const malformedJson = createBrowserFixture();
  malformedJson.resources.set('/integrity-manifest.json', '{');
  assert.equal(await verifyFixture(malformedJson), 'invalid');

  const malformedSignature = createBrowserFixture();
  malformedSignature.resources.set('/integrity-manifest.sig', '***');
  assert.equal(await verifyFixture(malformedSignature), 'invalid');

  const malformedPem = createBrowserFixture();
  malformedPem.resources.set('/signing-public-key.pem', 'PUBLIC KEY');
  assert.equal(await verifyFixture(malformedPem), 'invalid');
});

test('softwareId distinto y commit o fingerprint inválidos son invalid', async () => {
  const fixture = createBrowserFixture();
  for (const mutation of [
    (manifest) => { manifest.softwareId = 'otro-motor'; },
    (manifest) => { manifest.commit = ''; },
    (manifest) => { manifest.commit = 'short'; },
    (manifest) => { manifest.commit = 'commit con espacios'; },
    (manifest) => { manifest.publicKeyFingerprint = 'SHA256:invalido='; }
  ]) {
    const candidate = structuredClone(fixture.manifest);
    mutation(candidate);
    assert.equal(isManifestValid(candidate, companyConfig), false);
  }
});

test('commit acepta null, SHA e identificadores seguros de otros proveedores', () => {
  const fixture = createBrowserFixture();
  for (const commit of [null, 'a'.repeat(40), 'release_2026.07-abc']) {
    assert.equal(
      isManifestValid({ ...fixture.manifest, commit }, companyConfig),
      true
    );
  }
  for (const commit of ['', 'short', 'a'.repeat(129), 'con espacio', 'abc/def']) {
    assert.equal(
      isManifestValid({ ...fixture.manifest, commit }, companyConfig),
      false
    );
  }
});

test('parser PEM exige un único bloque PUBLIC KEY con Base64 estricto', () => {
  const fixture = createBrowserFixture();
  assert.ok(pemToBytes(fixture.publicKeyPem).byteLength > 0);
  const body = fixture.publicKeyPem
    .replace('-----BEGIN PUBLIC KEY-----', '')
    .replace('-----END PUBLIC KEY-----', '')
    .replace(/\s/g, '');
  for (const invalidPem of [
    fixture.publicKeyPem.replace('BEGIN PUBLIC KEY', 'BEGIN RSA PUBLIC KEY'),
    fixture.publicKeyPem.replace('END PUBLIC KEY', 'END RSA PUBLIC KEY'),
    `contenido\n${fixture.publicKeyPem}`,
    fixture.publicKeyPem + fixture.publicKeyPem,
    `-----BEGIN PUBLIC KEY-----\n***\n-----END PUBLIC KEY-----`,
    `-----BEGIN PUBLIC KEY-----\n-${body.slice(1)}\n-----END PUBLIC KEY-----`,
    '-----BEGIN PUBLIC KEY-----\n\n-----END PUBLIC KEY-----'
  ]) {
    assert.throws(() => pemToBytes(invalidPem));
  }
});

test('DER que no es una clave Ed25519 importable devuelve invalid', async () => {
  const fixture = createBrowserFixture();
  const invalidDer = Buffer.from('no-es-una-clave');
  const invalidPem = [
    '-----BEGIN PUBLIC KEY-----',
    invalidDer.toString('base64'),
    '-----END PUBLIC KEY-----',
    ''
  ].join('\n');
  fixture.manifest.publicKeyFingerprint =
    'SHA256:' + createHash('sha256').update(invalidDer).digest('base64url');
  fixture.resources.set('/signing-public-key.pem', invalidPem);
  resign(fixture);
  assert.equal(await verifyFixture(fixture), 'invalid');
});

test('URLs protegidas quedan confinadas al directorio base', () => {
  const base = new URL('https://example.test/catalogo/');
  assert.equal(
    resolveProtectedUrl('assets/app.js', base).href,
    'https://example.test/catalogo/assets/app.js'
  );
  assert.equal(
    resolveProtectedUrl('fonts/Head Sans.woff2', base).href,
    'https://example.test/catalogo/fonts/Head%20Sans.woff2'
  );
  for (const malicious of [
    'https://evil.test/file',
    '//evil.test/file',
    'data:text/plain,x',
    '../file',
    '%2e%2e/file',
    'assets%2fsecret',
    'assets%5csecret',
    'file%00.js',
    'file.js?x=1',
    'file.js#x',
    '/catalogo-malicioso/file',
    'assets//file'
  ]) {
    assert.throws(() => resolveProtectedUrl(malicious, base), malicious);
  }
});

test('canonicalización Node y React es idéntica en string y UTF-8', () => {
  const fixtures = [
    createBrowserFixture().manifest,
    { z: 0, a: -12.5, optional: null, enabled: true },
    { nested: { unicode: 'Catálogo 🎾', escaped: 'línea\n"texto"\\' } },
    { array: [null, false, 0, -1, 'á'], object: { b: 2, a: 1 } },
    { b: { d: 4, c: 3 }, a: ['x', { y: true }] }
  ];
  for (const fixture of fixtures) {
    const nodeResult = canonicalizeNode(fixture);
    const reactResult = canonicalizeReact(fixture);
    assert.equal(nodeResult, reactResult);
    assert.deepEqual(
      Buffer.from(nodeResult, 'utf8'),
      Buffer.from(new TextEncoder().encode(reactResult))
    );
  }
  assert.equal(
    canonicalizeNode({ b: 2, a: 1 }),
    canonicalizeReact({ a: 1, b: 2 })
  );
});
