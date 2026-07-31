import fs from 'node:fs/promises';
import {
  defaultPrivateKeyPath,
  manifestPath,
  signaturePath
} from './integrity/paths.mjs';
import {
  readPrivateKey,
  writeSignature
} from './integrity/releaseOperations.mjs';

const privateKeyPem = await readPrivateKey({
  privateKeyPath: process.env.SIGNING_PRIVATE_KEY_PATH || defaultPrivateKeyPath,
  privateKeyPem: process.env.SIGNING_PRIVATE_KEY_PEM
});
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
await writeSignature({ manifest, privateKeyPem, signaturePath });
console.log(`Firma generada: ${signaturePath}`);
