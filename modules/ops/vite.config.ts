import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'ops',
      filename: 'remoteEntry.js',
      exposes: { './OpsAdminPage': './src/OpsAdminPage.tsx' },
      shared: { react: { singleton: true }, 'react-dom': { singleton: true } },
    }),
  ],
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome89', rollupOptions: { input: 'src/index.ts' } },
});
