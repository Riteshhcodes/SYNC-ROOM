import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: undefined,
      }
    }
  },
  esbuild: {
    keepNames: true,
  },
  optimizeDeps: {
    force: true
  },
  server: {
    port: 3005,
    host: true,
  },
});
