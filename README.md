# 叮叮车旅行 · AI 旅行规划

一个以「AI 规划行程」为核心的旅行网站：浏览精选目的地、和 AI 助手聊出行方案、查看旅行数据看板。
移动端优先（Vant 底部导航），同时适配桌面端布局。

![Vue](https://img.shields.io/badge/Vue-3.5-42b883) ![Vite](https://img.shields.io/badge/Vite-6-646cff) ![Vant](https://img.shields.io/badge/Vant-4-1989fa) ![ECharts](https://img.shields.io/badge/ECharts-5-aa344d) ![Express](https://img.shields.io/badge/Express-5-000000)

## 功能

| 模块 | 说明 |
| --- | --- |
| 首页 `/` | 轮播 Banner、平台特色、热门目的地卡片 |
| AI 助手 `/AI` | 多轮对话、快捷提问、加载态、错误提示、超时保护 |
| 数据分析 `/Visualization` | ECharts 饼图 / 柱状图 / 词云，窗口自适应，实例随组件卸载回收 |
| 景点一览 `/Content` | 目的地卡片列表，响应式栅格 |

## 技术栈

- **前端**：Vue 3（`<script setup>` + Options API 共存）、Vue Router 4、Vant 4（按需注册）、ECharts 5 + wordcloud、Axios
- **后端**：Node.js + Express 5，转发大模型请求（OpenAI 兼容协议，默认 DeepSeek）
- **构建**：Vite 6、ESLint 9

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量（复制模板后填入自己的 Key）
copy .env.example .env.local      # macOS / Linux: cp .env.example .env.local

# 3. 启动后端（终端 1）
npm run server

# 4. 启动前端（终端 2）
npm run dev
```

打开 http://localhost:5173 。开发环境下前端请求 `/api/*` 由 Vite 代理到 `http://localhost:3000`，因此**前端代码里没有任何硬编码的接口域名**。

> `AI_API_KEY` 缺失时后端会直接退出并打印配置指引，不会带着错误配置硬跑。

## 环境变量

见 `.env.example`。关键项：

| 变量 | 作用 |
| --- | --- |
| `AI_API_KEY` | 大模型 API Key（**只放 `.env.local`，已被 `.gitignore` 忽略**） |
| `AI_BASE_URL` / `AI_MODEL` | 上游服务地址与模型名，可换成任意 OpenAI 兼容服务 |
| `AI_TIMEOUT_MS` | 上游请求超时，默认 30s |
| `PORT` | 后端端口，默认 3000 |
| `CORS_ORIGINS` | 生产环境允许的前端域名，逗号分隔 |
| `VITE_API_BASE_URL` | 部署到线上时后端地址；开发环境留空走代理 |

## 接口

`POST /api/ai/chat`

```jsonc
// 请求
{ "messages": [{ "role": "user", "content": "巴厘岛 5 天怎么玩？" }] }
// 响应
{ "reply": "……", "usage": { "prompt_tokens": 0, "completion_tokens": 0 } }
```

服务端做了这些防护：

- **角色白名单**：只接受 `user` / `assistant`，外部无法注入 `system` 提示词
- **去重**：连续重复的消息自动合并（客户端重复提交时不会重复扣 token）
- **截断**：单条上限 2000 字、历史最多 12 条，控制上下文成本
- **限流**：每 IP 每分钟 20 次
- **错误映射**：鉴权失败 / 上游限流 / 超时分别返回 502 / 429 / 504 和可读文案

`GET /api/health` 返回当前模型与上游地址，便于排查部署问题。

## 目录结构

```
├─ server.cjs              # 后端：对话转发、校验、限流
├─ .env.example            # 环境变量模板
├─ index.html
├─ vite.config.js          # /api 开发代理
└─ src/
   ├─ main.js              # 应用入口，Vant 组件按需注册
   ├─ App.vue              # 头部导航 / 页脚 / 移动端 TabBar
   ├─ router/index.js
   ├─ views/               # 4 个页面
   ├─ components/          # 业务组件
   └─ assets/              # 设计变量、基础样式、图片
```

## 后续计划

- [ ] 目的地详情页 `/destination/:id` + 搜索、分类筛选（筛选条件同步到 URL）
- [ ] 收藏 / 行程本（Pinia + localStorage）
- [ ] AI 回复改为 SSE 流式输出
- [ ] 迁移 TypeScript，补 Vitest 单测与 GitHub Actions

## 说明

全部图片与目的地数据为演示用静态素材，仅用于展示交互与工程实现。