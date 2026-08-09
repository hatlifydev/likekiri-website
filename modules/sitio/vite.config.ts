import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'sitio',
      filename: 'remoteEntry.js',
      exposes: {
        './SitioPage': './src/SitioPage.tsx',
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
