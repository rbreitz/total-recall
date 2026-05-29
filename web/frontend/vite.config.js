import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During dev, proxy /api to the FastAPI backend so the frontend can use
// relative URLs in both dev and the single-port production build.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
