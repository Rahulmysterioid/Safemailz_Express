import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Wait for file writes to finish before rebuilding styles during development.
    watch: { awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 100 } },
    proxy: {
      // Forward all /api requests to the Express backend
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    }
  }
})
