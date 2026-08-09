import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';

// Un mismo módulo expone islas para la superficie web (registro, acceso,
// portal) y páginas para el admin (cuentas, facturación). El core no sabe
// nada de "clientes": todo entra por el manifest.
export default defineConfig({
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
});
