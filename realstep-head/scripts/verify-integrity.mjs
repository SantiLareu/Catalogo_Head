import {
  manifestPath,
  publicationRoot,
  publicKeyPath,
  signaturePath
} from './integrity/paths.mjs';
import { loadAndVerifyPublication } from './integrity/releaseOperations.mjs';

try {
  const result = await loadAndVerifyPublication({
    publicationRoot,
    manifestPath,
    signaturePath,
    publicKeyPath
  });
  console.log(
    `Verificación correcta: ${result.projectId} ${result.version} (${result.softwareId}).`
  );
} catch (error) {
  console.error(`[${error.code || 'ERROR'}] ${error.message}`);
  process.exitCode = 1;
}
