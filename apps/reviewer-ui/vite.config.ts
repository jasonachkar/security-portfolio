import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    // Forward API calls to the scan-engine during local dev so the SPA can use
    // relative /api/* URLs (same as production behind vercel.json).
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
