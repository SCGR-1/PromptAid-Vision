/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  resolve: { 
    dedupe: ['react', 'react-dom'] 
  },
  optimizeDeps: { 
    include: ['react', 'react-dom'] 
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          // Core framework
          if (/[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/.test(id)) {
            return 'vendor-react'
          }
          // UI libs (all @ifrc-go/* + lucide)
          if (/[\\/]node_modules[\\/]@ifrc-go[\\/]/.test(id) || /[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
            return 'vendor-ui'
          }
          // Utils
          if (/[\\/]node_modules[\\/]jszip[\\/]/.test(id)) return 'vendor-utils'

          // Fallback vendor bucket
          return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 1000
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    deps: {
      inline: ['@ifrc-go/ui']
    }
  },
})


