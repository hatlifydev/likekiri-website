import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// Dos builds:
//  - cliente (federado): remoteEntry.js con las islas y páginas de admin.
//  - SSR (dist-ssr): entry-ssr.js que el server.mjs usa para renderToString
//    cuando el core delega el SSR de una isla (ssr: 'server').
export default defineConfig(({ isSsrBuild }) =>
  isSsrBuild
    ? {
        plugins: [react()],
        build: {
          outDir: 'dist-ssr',
          emptyOutDir: true,
          ssr: 'src/entry-ssr.ts',
        },
      }
    : {
        plugins: [
          react(),
          federation({
            name: 'clientes',
            filename: 'remoteEntry.js',
            exposes: {
              './RegistroIsland': './src/RegistroIsland.tsx',
              './AccesoIsland': './src/AccesoIsland.tsx',
              './PortalIsland': './src/PortalIsland.tsx',
              './CuentasAdminPage': './src/CuentasAdminPage.tsx',
              './FacturacionAdminPage': './src/FacturacionAdminPage.tsx',
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
      },
);
