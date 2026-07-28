import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
}

export async function writeOutputSafely(outputPath, contents) {
  const outputDirectory = path.dirname(outputPath);
  const token = process.pid + '-' + crypto.randomUUID();
  const temporaryPath = path.join(
    outputDirectory,
    '.' + path.basename(outputPath) + '.' + token + '.tmp'
  );
  const backupPath = path.join(
    outputDirectory,
    '.' + path.basename(outputPath) + '.' + token + '.bak'
  );

  await fs.mkdir(outputDirectory, {
    recursive: true
  });
  await fs.writeFile(temporaryPath, contents, 'utf8');

  const verified = await fs.readFile(temporaryPath, 'utf8');

  if (verified !== contents) {
    await fs.rm(temporaryPath, {
      force: true
    });
    throw new Error(
      'El archivo temporal no coincide con el contenido generado.'
    );
  }

  const hadPreviousOutput = await exists(outputPath);

  try {
    if (hadPreviousOutput) {
      await fs.rename(outputPath, backupPath);
    }

    await fs.rename(temporaryPath, outputPath);

    if (hadPreviousOutput) {
      await fs.rm(backupPath, {
        force: true
      });
    }
  } catch (error) {
    if (await exists(backupPath)) {
      if (await exists(outputPath)) {
        await fs.rm(outputPath, {
          force: true
        });
      }
      await fs.rename(backupPath, outputPath);
    }

    await fs.rm(temporaryPath, {
      force: true
    });
    throw error;
  }
}
