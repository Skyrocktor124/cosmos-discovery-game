import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative base so the built app works on GitHub Pages project sites,
  // itch.io uploads, and any static host without configuration.
  base: './',
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        astroMerge: path.resolve(__dirname, 'astro-merge/index.html'),
        orbitDash: path.resolve(__dirname, 'orbit-dash/index.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    }
  }
});
