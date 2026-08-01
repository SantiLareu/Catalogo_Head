import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));
const catalogPath = fileURLToPath(new URL('../generated/catalog.json', import.meta.url));

function publishedCatalogPlugin() {
  return {
    name: 'published-catalog',
    configureServer(server) {
      server.middlewares.use('/catalog.json', async (_request, response, next) => {
        try {
          response.statusCode = 200;
          response.setHeader('Content-Type', 'application/json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(await readFile(catalogPath));
        } catch (error) {
          next(error);
        }
      });
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'catalog.json',
        source: await readFile(catalogPath)
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
