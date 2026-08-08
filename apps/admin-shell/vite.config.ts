import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Prefijo propio para no colisionar con /assets del web-shell en el core.
  base: '/admin-assets/',
});
