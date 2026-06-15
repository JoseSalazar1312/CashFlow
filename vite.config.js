import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Mis Deudas',
        short_name: 'Deudas',
        description: 'Control personal de deudas y gastos',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        // Cachea assets estáticos para que la app cargue sin internet.
        // Los datos (PowerSync/SQLite) se manejan aparte, no via service worker.
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        runtimeCaching: []
      }
    })
  ],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    // Necesario para que wa-sqlite (usado por PowerSync) funcione en dev
    exclude: ['@journeyapps/wa-sqlite']
  },
  server: {
    headers: {
      // Requerido por SharedArrayBuffer que usa el motor SQLite del navegador
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    }
  }
})
