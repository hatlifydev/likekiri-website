import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// PLANTILLA superficie web. Claves:
//  - name = moduleId del manifest (el runtime carga "ejemplo-web/SimuladorIsland")
//  - el nombre expuesto (sin "./") debe coincidir con el export del archivo
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'ejemplo-web',
      filename: 'remoteEntry.js',
      exposes: {
        './SimuladorIsland': './src/SimuladorIsland.tsx',
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
