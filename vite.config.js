import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      // 开发环境把 /api 转发到本地后端，前端因此不需要硬编码域名，也不会触发跨域。
      // 后端端口改动时同步修改这里（或后端用 PORT 环境变量保持一致）。
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})