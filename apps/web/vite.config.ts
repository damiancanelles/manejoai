import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Proxies /api and /uploads to the NestJS server in dev so the frontend can
// just call relative paths ("/api/invoices") in both dev and prod.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/uploads': 'http://localhost:3001',
    },
  },
});
