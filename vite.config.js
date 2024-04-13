// vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';
import env from 'vite-plugin-env-compatible';

const root = resolve(__dirname, 'src');
const base = './';
const outDir = resolve(__dirname, 'dist');

export default defineConfig({
  root,
  base,
  plugins: [
    env({prefix: 'VITE', mountedPath: 'process.env'})
  ],
  build: {
    outDir,
    rollupOptions: {
      input: {
        map: resolve(root, 'map.html'),
        mountain: resolve(root, 'mountain.html'),
        routemap: resolve(root, 'routemap.html'),
        yamareco: resolve(root, 'yamareco.html')
      }
    }
  }
});
// __END__
