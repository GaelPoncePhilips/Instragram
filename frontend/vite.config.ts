import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Proxy /api → backend: evita CORS (el backend no lo configura) y funciona también desde el celular.
  // Para usarlo: VITE_API_URL=/api. Destino configurable con BACKEND_URL.
  const backend = env.BACKEND_URL || 'http://localhost:8000'
  const proxy = { '/api': { target: backend, changeOrigin: true } }
  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Escucha en todas las interfaces para probar desde el celular en la misma red Wi-Fi.
      host: true,
      port: 5173,
      proxy,
    },
    preview: {
      host: true,
      port: 4173,
      proxy,
    },
  }
})
