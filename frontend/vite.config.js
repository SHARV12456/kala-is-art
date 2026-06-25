import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    // In production, VITE_API_URL is set via Vercel env vars.
    // In dev, the proxy below routes /api → localhost:5000.
    server: {
      port: 3000,
      proxy: mode === 'development' ? {
        '/api': {
          target: env.VITE_API_URL ? env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000',
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (err) => console.error('[Vite Proxy Error]', err));
          },
        },
        '/uploads': {
          target: 'http://localhost:5000',
          changeOrigin: true,
        },
      } : {},
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor:  ['react', 'react-dom', 'react-router-dom'],
            charts:  ['recharts'],
            motion:  ['framer-motion'],
            query:   ['@tanstack/react-query', '@reduxjs/toolkit', 'react-redux'],
          },
        },
      },
    },
  }
})

