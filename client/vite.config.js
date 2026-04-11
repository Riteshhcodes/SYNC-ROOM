import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', 'react-router-dom', 'framer-motion', 'sonner']
  },
  server: {
    port: 3005,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
  },
});
