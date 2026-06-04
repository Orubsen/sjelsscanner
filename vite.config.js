import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Support both the Netlify-style path and the /api path used by the app + netlify.toml redirects.
      // This lets `npm run dev` + `netlify dev` (on 8888) work end-to-end for the analysis step.
      '/api': {
        target: 'http://localhost:8888',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000,
        rewrite: (path) => path.replace(/^\/api/, '/.netlify/functions')
      },
      '/.netlify/functions': 'http://localhost:8888'
    }
  }
})