import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['spider-bundle', 'burning-reveal']
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      external: [],
    },
    commonjsOptions: {
      ignore: ['spider-bundle.js', 'burning-reveal.js']
    }
  },
  server: {
    port: 3005,
    host: true,
  },
});
