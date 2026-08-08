import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));
export const publicationRoot = path.join(repoRoot, 'dist');
export const manifestPath = path.join(publicationRoot, 'integrity-manifest.json');
export const signaturePath = path.join(publicationRoot, 'integrity-manifest.sig');
export const publicKeyPath = path.join(publicationRoot, 'signing-public-key.pem');
export const defaultPrivateKeyPath = path.join(
  repoRoot,
  '.signing',
  'ed25519-private.pem'
);
export const exportedPublicKeyPath = path.join(
  repoRoot,
  'public',
  'signing-public-key.pem'
);
