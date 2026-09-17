import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * `base` must match the deployment path:
 *  - GitHub Pages project site: "/<repository-name>/"
 *  - user/organization site or custom domain: "/"
 * Set it through the VITE_BASE environment variable at build time.
 */
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    reportCompressedSize: false,
  },
  server: {
    port: 5173,
    open: false,
  },
});
