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

export async function writeOutputsSafely(outputs) {
  const token = process.pid + '-' + crypto.randomUUID();
  const prepared = outputs.map(function(output) {
    const outputPath = path.resolve(output.path);
    return {
      outputPath,
      contents: output.contents,
      temporaryPath: path.join(
        path.dirname(outputPath),
        '.' + path.basename(outputPath) + '.' + token + '.tmp'
      ),
      backupPath: path.join(
        path.dirname(outputPath),
        '.' + path.basename(outputPath) + '.' + token + '.bak'
      ),
      hadPreviousOutput: false,
      promoted: false
    };
  });

  try {
    for (const output of prepared) {
      await fs.mkdir(path.dirname(output.outputPath), { recursive: true });
      await fs.writeFile(output.temporaryPath, output.contents, 'utf8');
      const verified = await fs.readFile(output.temporaryPath, 'utf8');
      if (verified !== output.contents) {
        throw new Error(
          'El archivo temporal no coincide con el contenido generado: ' +
          output.outputPath
        );
      }
      output.hadPreviousOutput = await exists(output.outputPath);
    }

    for (const output of prepared) {
      if (output.hadPreviousOutput) {
        await fs.rename(output.outputPath, output.backupPath);
      }
      await fs.rename(output.temporaryPath, output.outputPath);
      output.promoted = true;
    }

  } catch (error) {
    for (const output of prepared.slice().reverse()) {
      if (output.promoted && await exists(output.outputPath)) {
        await fs.rm(output.outputPath, { force: true });
      }
      if (await exists(output.backupPath)) {
        await fs.rename(output.backupPath, output.outputPath);
      }
      await fs.rm(output.temporaryPath, { force: true });
    }
    throw error;
  }

  for (const output of prepared) {
    if (output.hadPreviousOutput) {
      await fs.rm(output.backupPath, { force: true });
    }
  }
}
