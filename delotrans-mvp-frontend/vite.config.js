import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    // L'interface relaie /api vers Laravel : un seul port à exposer (Codespaces)
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
