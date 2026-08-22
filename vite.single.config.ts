import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// One-off config: builds only the mossling page, as a single JS chunk with
// the CSS inlined, so it can be flattened into one standalone HTML file.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  css: { devSourcemap: false },
  build: {
    outDir: 'dist-single',
    emptyOutDir: true,
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      input: path.resolve(__dirname, 'mossling/index.html'),
      output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' },
    },
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
});
