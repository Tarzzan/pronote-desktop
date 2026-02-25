import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Lire la version depuis package.json pour l'injecter dans le build
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // base relative pour compatibilité Electron packagé (file://.../index.html)
  // évite les chemins absolus /assets/... qui produisent un écran blanc.
  base: './',
  define: {
    // Injecter la version depuis package.json pour garantir la cohérence front/package
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
