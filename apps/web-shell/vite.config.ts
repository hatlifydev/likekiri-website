import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dos builds:
//  - cliente: solo el runtime de islas (islands.js con nombre fijo, referenciado
//    por bootstrapModules del SSR como /assets/islands.js)
//  - servidor: entry-server.tsx para el SSR del shell desde el core
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  base: '/assets/',
  build: isSsrBuild
    ? {
        outDir: 'dist/server',
        emptyOutDir: true,
        ssr: 'src/entry-server.tsx',
      }
    : {
        outDir: 'dist/client',
        emptyOutDir: true,
        rollupOptions: {
          input: 'src/islands.ts',
          output: {
            entryFileNames: 'islands.js',
            chunkFileNames: 'chunk-[hash].js',
            assetFileNames: '[name]-[hash][extname]',
          },
        },
      },
}));
