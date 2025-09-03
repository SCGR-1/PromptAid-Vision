/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: {
    // Make EVERY import of react/react-dom resolve to this one location
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime'], // add jsx-runtime
  },
  build: {
    // ⛔ TEMP: comment out your manualChunks block while we test
    // rollupOptions: { output: { manualChunks: { ... } } },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true, secure: false } },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    deps: { inline: ['@ifrc-go/ui'] },
  },
})
