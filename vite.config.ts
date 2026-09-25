import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss()
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500, // Increased to accommodate the client application bundle budget cleanly
  },
  test: {
    exclude: ['src/tests/e2e/**', 'node_modules/**'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@/ds': path.resolve(__dirname, './src/platform/ui/design-system'),
      '@/shared': path.resolve(__dirname, './src/shared'),
      '@/features': path.resolve(__dirname, './src/features'),
      '@/modules': path.resolve(__dirname, './src/modules'),
    },
  },
  server: {
    hmr: { port: 25000 + Math.floor(Math.random() * 40000) },
  }
});
