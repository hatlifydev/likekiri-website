import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// PLANTILLA superficie admin. name = moduleId; cada expose es una página que
// la SPA monta cuando la ruta del manifest coincide.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'ejemplo-admin',
      filename: 'remoteEntry.js',
      exposes: {
        './PanelPage': './src/PanelPage.tsx',
        './AjustesPage': './src/AjustesPage.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    target: 'chrome89',
    rollupOptions: {
      input: 'src/index.ts',
    },
  },
});
