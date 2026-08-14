import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createAppVersion } from './scripts/app-version.mjs';

const repositoryRoot = fileURLToPath(new URL('./', import.meta.url));
const catalogPath = fileURLToPath(new URL('./generated/catalog.json', import.meta.url));
const catalogVersionPath = fileURLToPath(new URL('./generated/catalog-version.json', import.meta.url));
const appVersion = await createAppVersion(repositoryRoot);

const publishedCatalogFiles = new Map([
  ['/catalog.json', catalogPath],
  ['/catalog-version.json', catalogVersionPath]
]);

function publishedCatalogPlugin() {
  return {
    name: 'published-catalog',
    configureServer(server) {
      publishedCatalogFiles.forEach((sourcePath, publicPath) => {
        server.middlewares.use(publicPath, async (_request, response, next) => {
          try {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json; charset=utf-8');
            response.setHeader('Cache-Control', 'no-store');
            response.end(await readFile(sourcePath));
          } catch (error) {
            next(error);
          }
        });
      });
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'catalog.json',
        source: await readFile(catalogPath)
      });
      this.emitFile({
        type: 'asset',
        fileName: 'catalog-version.json',
        source: await readFile(catalogVersionPath)
      });
    }
  };
}

function appVersionPlugin() {
  return {
    name: 'app-version',
    transformIndexHtml() {
      return [{
        tag: 'meta',
        attrs: { name: 'realstep-app-version', content: appVersion },
        injectTo: 'head'
      }];
    },
    configureServer(server) {
      server.middlewares.use('/app-version.json', (_request, response) => {
        response.statusCode = 200;
        response.setHeader('Content-Type', 'application/json; charset=utf-8');
        response.setHeader('Cache-Control', 'no-store');
        response.end(JSON.stringify({
          schemaVersion: 1,
          version: appVersion,
          files: [{ path: 'index.html', size: 0, sha256: '0'.repeat(64) }]
        }) + '\n');
      });
    },
    async writeBundle(options, bundle) {
      const outputRoot = path.resolve(options.dir);
      const readinessPaths = ['index.html', ...Object.values(bundle)
        .filter((item) =>
          item.type === 'chunk' ||
          item.fileName.endsWith('.css')
        )
        .map((item) => item.fileName)]
        .sort((left, right) => left.localeCompare(right, 'en'));
      const readinessFiles = [];
      for (const fileName of readinessPaths) {
        const contents = await readFile(path.join(outputRoot, fileName));
        readinessFiles.push({
          path: fileName,
          size: contents.length,
          sha256: createHash('sha256').update(contents).digest('hex')
        });
      }

      await writeFile(
        path.join(outputRoot, 'app-version.json'),
        JSON.stringify({
          schemaVersion: 1,
          version: appVersion,
          files: readinessFiles
        }, null, 2) + '\n',
        'utf8'
      );
    }
  };
}

export default defineConfig({
  base: './',
  define: {
    __REALSTEP_APP_VERSION__: JSON.stringify(appVersion)
  },
  plugins: [react(), publishedCatalogPlugin(), appVersionPlugin()],
  server: {
    fs: {
      allow: [repositoryRoot]
    }
  }
});
