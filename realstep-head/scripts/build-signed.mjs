import { spawn } from 'node:child_process';
import {
  defaultPrivateKeyPath,
  publicationRoot,
  repoRoot
} from './integrity/paths.mjs';
import {
  createTransactionalSignedPublication,
  readPrivateKey
} from './integrity/releaseOperations.mjs';

const privateKeyPem = await readPrivateKey({
  privateKeyPath: process.env.SIGNING_PRIVATE_KEY_PATH || defaultPrivateKeyPath,
  privateKeyPem: process.env.SIGNING_PRIVATE_KEY_PEM
});
const verification = await createTransactionalSignedPublication({
  repoRoot,
  publicationRoot,
  privateKeyPem,
  runBuild: runNpmBuild
});
console.log(
  `Build firmado y verificado: ${verification.projectId} ${verification.version}. ` +
  `Publicación: ${verification.publicationMethod}.`
);

function runNpmBuild(outputRoot) {
  return new Promise((resolve, reject) => {
    const npmExecutable = process.env.npm_execpath;
    const useWindowsNpmShim = !npmExecutable && process.platform === 'win32';
    const command = npmExecutable
      ? process.execPath
      : useWindowsNpmShim
        ? process.env.ComSpec
        : 'npm';
    const args = [
      ...(npmExecutable ? [npmExecutable] : []),
      ...(useWindowsNpmShim ? ['/d', '/s', '/c', 'npm.cmd'] : []),
      '--prefix',
      'react-app',
      'run',
      'build',
      '--',
      '--outDir',
      outputRoot
    ];
    const child = spawn(command, args, {
      cwd: repoRoot,
      stdio: 'inherit'
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`El build React terminó con código ${code}.`));
    });
  });
}
