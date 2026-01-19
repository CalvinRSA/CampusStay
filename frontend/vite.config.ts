import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',  // ✅ CRITICAL: This copies files from public/ to dist/
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});