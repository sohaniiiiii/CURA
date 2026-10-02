import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',  // Node backend
        changeOrigin: true,
        secure: false,
      },
      // ---- OLD DIRECT PYTHON PROXY — removed in Phase 1 ----
      // The frontend no longer calls Python directly.
      // All chat requests go: Frontend → Node /api/chat → Python /ai/chat
      // '/ai': {
      //   target: 'http://localhost:8000',
      //   changeOrigin: true,
      //   secure: false,
      // }
      // ---- END OLD PROXY ----
    }
  }
});
