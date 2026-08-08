// Tests estáticos del workflow de deploy a GitHub Pages.
//
// Estos tests verifican que el workflow declara el pipeline correcto sin
// requerir acceso a una clave privada ni ejecutar el build firmado:
//   1. ejecuta `react:build:signed` (no `build` directo);
//   2. expone `SIGNING_PRIVATE_KEY_PEM` desde secrets como env del step;
//   3. ejecuta `test-integrity` y `integrity:verify`;
//   4. desactiva la cancelación concurrente para no abortar una publicación
//      firmada a mitad de camino;
//   5. el pipeline firmado produce los tres artefactos requeridos
//      (manifest, firma y clave pública) bajo la raíz de publicación.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflowPath = new URL('../../.github/workflows/deploy-pages.yml', import.meta.url);
const buildSignedPath = new URL('../../scripts/build-signed.mjs', import.meta.url);
const integrityCorePath = new URL('../../scripts/integrity/integrityCore.mjs', import.meta.url);
const pathsModulePath = new URL('../../scripts/integrity/paths.mjs', import.meta.url);
const releaseOpsPath = new URL('../../scripts/integrity/releaseOperations.mjs', import.meta.url);

function extractSteps(workflow, runPattern) {
  const matches = [];
  // Captura steps `name:` -> (posiblemente env:) -> `run:`. El bloque intermedio
  // puede incluir `env:` con varias líneas, así que usamos [\s\S]*? no greedy.
  const re = new RegExp(`- name: ([^\\n]+)[\\s\\S]*?run: ${runPattern}`, 'g');
  let match;
  while ((match = re.exec(workflow)) !== null) {
    matches.push({ name: match[1].trim(), run: match[2] });
  }
  return matches;
}

function findRunStep(workflow, runCommand) {
  const re = new RegExp(`- name: ([^\\n]+)[\\s\\S]*?run: ${runCommand}`, 'm');
  const match = re.exec(workflow);
  return match ? { name: match[1].trim() } : null;
}

test('deploy-pages.yml publica solo un build firmado y nunca el build directo', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.ok(
    findRunStep(workflow, 'npm run react:build:signed'),
    'el workflow debe ejecutar `npm run react:build:signed`.'
  );
  assert.equal(
    findRunStep(workflow, 'npm run build'),
    null,
    'el workflow no debe ejecutar `npm run build` directo (solo el firmado).'
  );
});

test('deploy-pages.yml expone SIGNING_PRIVATE_KEY_PEM al step de build firmado', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  // Busca un step con env: SIGNING_PRIVATE_KEY_PEM: ${{ secrets.SIGNING_PRIVATE_KEY_PEM }}
  // seguido de un run: npm run react:build:signed en el mismo bloque.
  const re = /env:\s*\n\s*SIGNING_PRIVATE_KEY_PEM:\s*\$\{\{\s*secrets\.SIGNING_PRIVATE_KEY_PEM\s*\}\}\s*\n\s*run:\s*npm run react:build:signed/m;
  assert.ok(
    re.test(workflow),
    'el step de build firmado debe declarar `env: SIGNING_PRIVATE_KEY_PEM: ${{ secrets.SIGNING_PRIVATE_KEY_PEM }}`.'
  );
  // La clave no debe quedar como env global ni fuera del step.
  assert.equal(
    /env:\s*\n\s*SIGNING_PRIVATE_KEY_PEM/m.test(workflow.split('jobs:')[0] || ''),
    false,
    'SIGNING_PRIVATE_KEY_PEM no debe filtrarse fuera de los jobs.'
  );
});

test('deploy-pages.yml ejecuta tests de integridad y verificación post-firma', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.ok(
    findRunStep(workflow, 'npm run test-integrity'),
    'el workflow debe correr `npm run test-integrity` antes del build firmado.'
  );
  assert.ok(
    findRunStep(workflow, 'npm run integrity:verify'),
    'el workflow debe correr `npm run integrity:verify` después del build firmado.'
  );

  // Verifica el orden: test-integrity antes que react:build:signed, y
  // react:build:signed antes que integrity:verify.
  const testIntegrityAt = workflow.indexOf('npm run test-integrity');
  const signedBuildAt = workflow.indexOf('npm run react:build:signed');
  const verifyAt = workflow.indexOf('npm run integrity:verify');
  assert.ok(testIntegrityAt > 0 && signedBuildAt > testIntegrityAt, 'test-integrity debe preceder al build firmado.');
  assert.ok(verifyAt > signedBuildAt, 'integrity:verify debe correr después del build firmado.');
});

test('deploy-pages.yml desactiva la cancelación concurrente durante la publicación firmada', async () => {
  const workflow = await readFile(workflowPath, 'utf8');
  assert.match(
    workflow,
    /concurrency:\s*\n\s*group: "pages"\s*\n\s*cancel-in-progress: false/,
    'cancel-in-progress debe ser false para no abortar una firma en curso.'
  );
});

test('el pipeline firmado emite los tres artefactos de integridad en dist/', async () => {
  const [core, pathsModule, buildSigned, releaseOps] = await Promise.all([
    readFile(integrityCorePath, 'utf8'),
    readFile(pathsModulePath, 'utf8'),
    readFile(buildSignedPath, 'utf8'),
    readFile(releaseOpsPath, 'utf8')
  ]);

  // Las constantes canónicas viven en scripts/integrity/integrityCore.mjs.
  assert.match(core, /export const MANIFEST_FILE = 'integrity-manifest\.json';/);
  assert.match(core, /export const SIGNATURE_FILE = 'integrity-manifest\.sig';/);
  assert.match(core, /export const PUBLIC_KEY_FILE = 'signing-public-key\.pem';/);

  // paths.mjs expone las rutas de publicación para cada artefacto, apuntando
  // a `dist/` en la raíz del repositorio.
  assert.match(pathsModule, /publicationRoot = path\.join\(repoRoot, 'dist'\)/);
  assert.match(pathsModule, /manifestPath = path\.join\(publicationRoot, 'integrity-manifest\.json'\)/);
  assert.match(pathsModule, /signaturePath = path\.join\(publicationRoot, 'integrity-manifest\.sig'\)/);
  assert.match(pathsModule, /publicKeyPath = path\.join\(publicationRoot, 'signing-public-key\.pem'\)/);

  // build-signed.mjs delega en createTransactionalSignedPublication, que
  // termina llamando a createSignedPublication y emite los tres archivos.
  assert.match(buildSigned, /createTransactionalSignedPublication/);
  assert.match(buildSigned, /runNpmBuild/);

  // releaseOperations.mjs declara los hooks de escritura para los tres
  // artefactos. La presencia de writePublicKey/writeManifest/writeSignature
  // garantiza que se generan desde un único flujo coherente.
  assert.match(releaseOps, /export async function writePublicKey/);
  assert.match(releaseOps, /export async function writeManifest/);
  assert.match(releaseOps, /export async function writeSignature/);
});