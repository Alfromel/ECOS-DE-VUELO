import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,jpg,webmanifest}'],
        // ESTA ES LA LÍNEA MÁGICA: Aumenta el límite a 5 MB
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 
      }
    })
  ],
  build: {
    rollupOptions: {
      input: { 
        main: resolve(import.meta.dirname, 'index.html'), 
        admin: resolve(import.meta.dirname, 'admin.html') 
      },
    },
  },
})