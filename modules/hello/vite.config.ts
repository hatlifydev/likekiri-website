import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// Build federado: expone los componentes vía remoteEntry.js. Los shells los
// cargan en runtime con @module-federation/runtime; el core jamás importa esto.
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'hello',
      filename: 'remoteEntry.js',
      exposes: {
        './HelloIsland': './src/HelloIsland.tsx',
        './HelloAdminPage': './src/HelloAdminPage.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  build: {
    outDir: 'dist',
    // Module Federation emite top-level await; requiere targets modernos.
    target: 'chrome89',
    rollupOptions: {
      // Entrada nominal: lo que importa del build es remoteEntry.js.
      input: 'src/index.ts',
    },
  },
});
