import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryRoot = fileURLToPath(new URL('./', import.meta.url));
const catalogPath = fileURLToPath(new URL('./generated/catalog.json', import.meta.url));
const catalogVersionPath = fileURLToPath(new URL('./generated/catalog-version.json', import.meta.url));

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

export default defineConfig({
  base: './',
  plugins: [react(), publishedCatalogPlugin()],
  server: {
    fs: {
      allow: [repositoryRoot]
    }
  }
});
