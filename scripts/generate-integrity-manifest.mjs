import fs from 'node:fs/promises';
import {
  manifestPath,
  publicationRoot,
  publicKeyPath,
  repoRoot
} from './integrity/paths.mjs';
import {
  createManifest,
  writePublicKey,
  writeManifest
} from './integrity/releaseOperations.mjs';

const sourcePublicKeyPath =
  process.env.SIGNING_PUBLIC_KEY_PATH || publicKeyPath;
const publicKeyPem = await fs.readFile(sourcePublicKeyPath, 'utf8');
await writePublicKey({ publicKeyPem, publicKeyPath });
const manifest = await createManifest({
  repoRoot,
  publicationRoot,
  publicKeyPem
});
await writeManifest({ manifest, manifestPath });
console.log(`Manifiesto generado: ${manifestPath}`);
