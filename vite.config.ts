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
  // base '/' est requis pour que Flask serve correctement les assets depuis /assets/
  // (base './' génère des chemins relatifs qui cassent quand Flask sert depuis /usr/lib/pronote-desktop/)
  base: '/',
  define: {
    // Injecter la version depuis package.json pour garantir la cohérence front/package
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
