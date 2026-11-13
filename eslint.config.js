import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import pluginVue from 'eslint-plugin-vue'

export default defineConfig([
  // files 只决定「这段配置作用于哪些文件」，同时也会把 .ts / .vue 纳入检查范围。
  // ESLint 9 默认只检查 .js / .mjs / .cjs，所以这里显式列出。
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  // .vue 里的 <script lang="ts"> 交给 TypeScript 解析器
  {
    name: 'app/vue-ts-parser',
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },

  // 前端源码：浏览器环境
  {
    name: 'app/browser-globals',
    files: ['src/**/*.{js,ts,vue}'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },

  // Node 侧：后端服务与构建配置
  {
    name: 'app/node-globals',
    files: ['**/*.cjs', '**/*.config.js', 'scripts/**/*.{js,mjs}', 'server/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
        // Node 18+ 内置的 Web 标准 API，globals 包各版本收录情况不一致，显式声明更稳
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        TextDecoder: 'readonly',
      },
    },
    rules: {
      // 后端是 CommonJS，require 是正常的模块加载方式
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
])