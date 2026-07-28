import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repositoryRoot = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    fs: {
      allow: [repositoryRoot]
    }
  }
});
