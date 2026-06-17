import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    outDir: '../static/react',
    emptyOutDir: true,
    manifest: true,
    rollupOptions: {
      input: './src/main.jsx',
    },
  },
  server: {
    host: true,        // bind to 0.0.0.0 so the dev server is reachable from other devices on the LAN
    port: 5173,
    strictPort: true,  // fail fast instead of silently moving to another port (keeps the proxy origin predictable)
    proxy: {
      // Proxy API calls to Django so the browser stays same-origin with the SPA.
      // This matters for auth: the verifydoc_token cookie is SameSite=Lax, so it is only
      // sent when /api/ shares the SPA's origin. Reaching the app over the LAN (e.g.
      // http://192.168.x.x:5173) works because the proxy forwards /api to Django for you.
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules/', 'src/main.jsx'],
    },
  },
})
