import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 5174,
    open: false,
    proxy: {
      '/api': {
        target: 'https://localhost:10010',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
