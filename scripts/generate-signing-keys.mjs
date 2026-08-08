import { generateKeyPairSync } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  defaultPrivateKeyPath,
  exportedPublicKeyPath
} from './integrity/paths.mjs';

const args = new Set(process.argv.slice(2));
const confirmed = args.has('--confirm');
const force = args.has('--force');
const privateKeyPath = path.resolve(
  process.env.SIGNING_PRIVATE_KEY_PATH || defaultPrivateKeyPath
);
const publicKeyPath = path.resolve(
  process.env.SIGNING_PUBLIC_KEY_PATH || exportedPublicKeyPath
);

if (!confirmed) {
  console.error(
    'Generación cancelada. Repetí el comando con --confirm para crear una identidad Ed25519.'
  );
  process.exitCode = 1;
} else {
  const existing = await Promise.all([
    exists(privateKeyPath),
    exists(publicKeyPath)
  ]);
  if (existing.some(Boolean) && !force) {
    console.error(
      'Ya existe una clave. Para una rotación deliberada usá --confirm --force.'
    );
    process.exitCode = 1;
  } else {
    const { privateKey, publicKey } = generateKeyPairSync('ed25519');
    await fs.mkdir(path.dirname(privateKeyPath), { recursive: true });
    await fs.mkdir(path.dirname(publicKeyPath), { recursive: true });
    await fs.writeFile(
      privateKeyPath,
      privateKey.export({ type: 'pkcs8', format: 'pem' }),
      { mode: 0o600 }
    );
    await fs.writeFile(
      publicKeyPath,
      publicKey.export({ type: 'spki', format: 'pem' }),
      { mode: 0o644 }
    );
    console.log('Par Ed25519 generado.');
    console.log('Clave privada guardada en una ruta local ignorada.');
    console.log(`Clave pública exportada: ${publicKeyPath}`);
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
