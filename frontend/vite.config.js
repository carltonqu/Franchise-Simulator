import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-landing-html',
      closeBundle() {
        // Copy landing.html to dist folder after build
        const src = resolve(__dirname, 'public/landing.html')
        const dest = resolve(__dirname, 'dist/landing.html')
        try {
          copyFileSync(src, dest)
          console.log('✓ Copied landing.html to dist/')
        } catch (err) {
          console.error('Failed to copy landing.html:', err)
        }
      }
    }
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
    },
  },
})
