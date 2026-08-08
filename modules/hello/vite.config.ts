import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Fase 6: este build pasa a Module Federation (@module-federation/vite) y
// expone ./HelloIsland y ./HelloAdminPage vía remoteEntry.js. Mientras tanto,
// un build de librería mantiene el paquete compilable y tipado.
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'react/jsx-runtime'],
    },
  },
});
