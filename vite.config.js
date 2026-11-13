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
        // 后端没启动时给一句人话提示，而不是只丢一个 ECONNREFUSED
        configure(proxy) {
          proxy.on('error', (error) => {
            if (error.code === 'ECONNREFUSED') {
              console.warn('\n[proxy] /api 请求失败：http://localhost:3000 没有服务在监听')
              console.warn('[proxy] 请另开一个终端运行：npm run server\n')
            }
          })
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        /**
         * 把体积大、几乎不随业务变化的依赖拆成独立 chunk：
         * 1. 业务 chunk 变小，首页不必为了一个图表路由下载全部代码；
         * 2. 这些包的 hash 稳定，发版后浏览器可以继续用缓存。
         *
         * 只拆 echarts / zrender，不动 vant —— vant 内部 import vue，
         * 再单独拆会形成 chunk 间的循环依赖。
         */
        manualChunks(id) {
          const path = id.replace(/\\/g, '/')
          if (path.includes('/node_modules/zrender/')) return 'zrender'
          if (path.includes('/node_modules/echarts')) return 'echarts'
          return undefined
        },
      },
    },
  },
})