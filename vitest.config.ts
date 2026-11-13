import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 单测只覆盖纯逻辑（SSE 解析、筛选排序），不依赖浏览器 DOM
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    reporters: 'default',
  },
})