# 叮叮车旅行 · AI 旅行规划

一个以「AI 规划行程」为核心的旅行网站：浏览精选目的地、和 AI 助手聊出行方案、查看旅行数据看板。
移动端优先（Vant 底部导航），同时适配桌面端布局。

![Vue](https://img.shields.io/badge/Vue-3.5-42b883) ![Vite](https://img.shields.io/badge/Vite-6-646cff) ![Vant](https://img.shields.io/badge/Vant-4-1989fa) ![ECharts](https://img.shields.io/badge/ECharts-5-aa344d) ![Express](https://img.shields.io/badge/Express-5-000000)

## 功能

| 模块 | 说明 |
| --- | --- |
| 首页 `/` | 轮播 Banner、平台特色、热门目的地（卡片直达详情） |
| 景点一览 `/Content` | **关键词搜索（防抖）+ 分类筛选 + 排序 + 只看收藏**，筛选条件同步到 URL，可分享 / 可刷新 / 可后退 |
| 目的地详情 `/destination/:id` | 图集切换、价格与最佳季节、行程亮点与出行提示、收藏、一键让 AI 规划该线路、同分类推荐 |
| AI 助手 `/AI` | **SSE 流式输出**（逐字渲染）、停止生成、多轮对话、快捷提问、错误提示；支持 `?prompt=` 预填行程需求 |
| 数据分析 `/Visualization` | ECharts 饼图 / 柱状图 / 词云，窗口自适应，实例随组件卸载回收 |
| 收藏 | 模块级 store + localStorage 持久化，跨页面 / 跨标签页同步 |

## 技术栈

- **前端**：Vue 3（`<script setup>` + Options API 共存）、Vue Router 4、Vant 4（按需注册）、ECharts 5 + wordcloud
- **类型**：全量 TypeScript（组件层 + 纯逻辑层），`vue-tsc` 纳入 CI
- **数据**：`GET /api/destinations` 真接口 + 本地 JSON 兜底，含加载 / 错误 / 降级三态
- **后端**：Node.js + Express 5，转发大模型请求（OpenAI 兼容协议，默认 DeepSeek），SSE 流式输出
- **构建**：Vite 6、ESLint 9
- **测试 / CI**：Vitest 3（纯函数单测）、GitHub Actions（lint → type-check → test → build）

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

## 质量保障

```bash
npm run lint        # ESLint 检查
npm run lint:fix    # 自动修复
npm run type-check  # vue-tsc 类型检查
npm test            # 单测（watch 模式）
npm run test:run    # 单测（CI 模式）
```

单测覆盖三处最值得测的纯逻辑（当前 **28 条**，全部跑在 node 环境）：

- `tests/sse.spec.ts`（10 条）：SSE 解析器的分帧、跨 chunk 截断、CRLF、多行 data、keep-alive 注释、末尾无空行
- `tests/filter.spec.ts`（14 条）：关键词 / 分类 / 收藏过滤，三种排序，不修改入参
- `tests/mapper.spec.ts`（4 条）：DTO → 视图模型的图片键名映射、未知键降级、本地数据无漏配图

CI（`.github/workflows/ci.yml`）在每次 push / PR 依次执行 lint → type-check → test → build，
构建产物以 artifact 形式保留。

> 首次提交前请先跑一次 `npm install`（新增了 TypeScript / Vitest 依赖），
> 并把更新后的 `package-lock.json` 一起提交，否则 CI 上的 `npm ci` 会因锁文件不同步而失败。

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

### 目的地接口 `GET /api/destinations`

```json
{
  "items": [
    {
      "id": "bali",
      "name": "巴厘岛",
      "coverKey": "bali1",
      "galleryKeys": ["bali1", "bali2"],
      "...": "其余字段同 Destination"
    }
  ],
  "total": 11
}
```

数据源是项目根目录的 `data/destinations.json`，**前后端共用同一份**：后端原样返回，前端在接口不可用时用它兜底。
图片只给键名（`coverKey` / `galleryKeys`），由 `toDestination()` 映射成打包后的地址 —— 这样换图不用改接口，也不需要后端知道前端资源怎么组织。

客户端 `useDestinations()` 做了三件事：模块级共享状态（三个页面共用一次请求）、单飞（并发调用只发一次）、
开发环境下接口不可用时降级到本地数据并提示，生产环境则如实展示错误态 + 重试。

### 流式接口 `POST /api/ai/chat/stream`

上游返回的是它自己的 SSE 格式，服务端做了一层**协议归一化**，前端只需认识三种事件：

```
event: delta
data: {"text":"巴厘岛"}

event: done
data: {}

event: error
data: {"message":"AI 服务繁忙，请稍后再试"}
```

前端用 `fetch` + `ReadableStream` 读取（`EventSource` 只支持 GET，无法提交 JSON body），
按行缓冲解析 SSE 帧，处理跨 chunk 截断与中文多字节边界；点「停止」时 `AbortController`
会同时中断浏览器请求与服务端的上游请求，避免模型继续计算。实现见 `src/api/sse.ts` 与 `src/api/chat.ts`。

## 目录结构

```
├─ server.cjs              # 后端：对话转发、校验、限流
├─ .env.example            # 环境变量模板
├─ index.html
├─ vite.config.js          # /api 开发代理
└─ src/
   ├─ main.js              # 应用入口，Vant 组件按需注册
   ├─ App.vue              # 头部导航 / 页脚 / 移动端 TabBar
   ├─ router/index.js      # 路由表（除首页外均懒加载）+ 滚动行为
   ├─ views/
   │  ├─ HomeView.vue
   │  ├─ ContentView.vue           # 搜索 / 筛选 / 排序
   │  ├─ DestinationDetailView.vue # /destination/:id
   │  ├─ AIView.vue
   │  └─ VisualizationView.vue
   ├─ components/
   │  └─ DestinationCard.vue       # 首页与列表页共用
   ├─ composables/
   │  ├─ useFavorites.ts            # 收藏状态 + localStorage
   │  └─ useDestinations.ts         # 目的地接口的共享状态（单飞 + 加载态）
   ├─ api/
   │  ├─ sse.ts                     # SSE 分帧解析（有单测）
   │  ├─ chat.ts                    # 流式对话客户端
   │  ├─ destinations.ts            # 目的地接口 + 开发期降级
   │  └─ abort.ts                   # AbortError 判断
   ├─ data/
   │  ├─ images.ts                  # 图片键名 → 打包后的地址
   │  ├─ destinations.ts            # DTO → 视图模型 + 本地兜底数据
   │  └─ filter.ts                  # 筛选排序纯函数（有单测）
   ├─ types.ts                      # 共享类型（含 DestinationDTO）
   └─ assets/                       # 设计变量、基础样式、图片
├─ data/destinations.json          # 前后端共用的数据源
├─ tests/                          # Vitest 单测
├─ .github/workflows/ci.yml        # CI：lint → type-check → test → build
├─ vercel.json                     # 前端部署配置（SPA 回退）
└─ tsconfig.json
```

## 实现要点

- **筛选状态与 URL 双向同步**：输入防抖 300ms 后才写入 URL，且使用 `router.replace`，不会把每个字符都塞进历史栈；浏览器前进 / 后退可正确还原
- **路由懒加载**：ECharts 与 AI 页不参与首屏加载，首页只下载必要代码
- **组件复用**：卡片抽成 `DestinationCard`，首页与列表页不再各写一套样式
- **收藏不用 Pinia**：当前规模用模块级 `reactive` + `localStorage` 即可，避免为 30 行状态引入依赖；需要时可直接迁移
- **流式输出的分块处理**：SSE 帧与 TCP chunk 不对齐，按行缓冲解析；中文多字节字符被切断时用 `TextDecoder({ stream: true })` 兜住
- **协议解耦**：上游字段（`choices[0].delta.content`）只出现在服务端，前端只消费 `delta / done / error` 三种事件
- **可中断**：用户停止或离开页面时，`AbortController` 逐层传递，浏览器请求与上游模型调用一起停
- **类型边界**：`api/` `data/filter` `composables/` 这些纯逻辑用 TypeScript 编写，组件层保留 JS 渐进迁移；`vue-tsc` 已纳入 CI
- **可测试性**：把「筛选排序」「SSE 分帧」「DTO 映射」抽成不依赖 DOM 的纯函数，因此单测跑在 node 环境，不需要 jsdom
- **异步数据三态**：加载用骨架屏而非转圈（避免布局跳动）；失败给重试按钮；开发环境降级到本地数据并**明确提示**，生产环境不降级、如实报错
- **单飞 + 共享状态**：`useDestinations()` 用模块级状态和 inflight 去重，首页 / 列表 / 详情共用一个请求

## 后续计划

- [x] 目的地详情页 `/destination/:id`
- [x] 搜索、分类筛选、排序，条件同步到 URL
- [x] 收藏 / 行程本（localStorage 持久化）
- [x] AI 回复改为 SSE 流式输出（支持中断）
- [x] 纯逻辑层迁移 TypeScript + Vitest 单测 + GitHub Actions
- [x] 组件层 TypeScript 迁移（`.vue` 全部 `lang="ts"`）
- [x] 数据层改为接口（`GET /api/destinations`，含加载 / 错误 / 降级态）
- [ ] 部署上线（Vercel 前端 + Render 后端，见下节）
- [ ] 图片 WebP 化与 CDN 托管

## 图片优化

`src/assets/image` 下是原始 jpg/png。执行：

```bash
npm run images:webp -- --force --prune
```

流程是「缩放 → 转 WebP → 按收益决策 → 删除被替代的源图」。实测数据以 `npm run build` 产物为准：

| 指标 | 优化前 | 优化后 | 变化 |
| --- | --- | --- | --- |
| 产物内图片总量 | 15.2 MB / 36 个文件 | 2.84 MB / 19 个文件 | **-81%** |
| 浏览器需下载的图片 | 10.9 MB（18 张原图） | 2.84 MB（18 张 WebP） | **-75%** |
| 单张最大（巴厘岛1） | 1.60 MB | 119 KB | **-93%** |

三个工程细节：

- **先缩放再编码**：`MAX_WIDTH = 1600`，超过才缩（`withoutEnlargement` 保证小图不放大）。只做格式转换是 -58%，加上缩放才到 -75% —— 分辨率才是真正的大头。
- **按收益决策**：第一轮 `banner1` / `banner3` 转 WebP 反而变大，脚本会跳过并保留 jpg；缩放之后它们才变成收益为正，脚本自动采用。不做「为了优化而变大」的优化。
- **产物只留一份**：`--prune` 只删除「已有更小 webp」的源图，`logo` 在保留名单里（`App.vue` 按原文件名直接引用）。上一版产物同时打包了 WebP 和 jpg，多出 10.9 MB 永远不会被下载的文件。

`src/data/images.ts` 用**精确路径**做 `import.meta.glob`（而不是 `*.*` 通配符），避免把目录里模板残留素材一起打进产物；
同时收集两种格式、优先取 WebP，所以**脚本没跑过也能正常构建**，跑完自动生效。

## 构建体积

图表路由（`/Visualization`）是唯一的重依赖页面，优化前后对比：

| 指标 | 优化前 | 优化后 |
| --- | --- | --- |
| 该路由 JS 总量 | 1,056 kB（单个 chunk） | 509 kB（3.90 + 335.95 + 169.07） |
| 该路由 JS（gzip） | 351 kB | **173 kB（-51%）** |
| 最大单 chunk | 1,056 kB（触发 `>500 kB` 警告） | 336 kB（无警告） |
| 全站图片 | 15.2 MB / 36 个文件 | **2.84 MB / 19 个文件** |

- **ECharts 按需引入**：`echarts` 整包 → `echarts/core` + 只注册用到的 `PieChart`、`BarChart`、`GridComponent`、`TitleComponent`、`TooltipComponent`、`CanvasRenderer`。gzip 体积基本靠这一步降下来。
- **vendor 分包**：`manualChunks` 把 `echarts` / `zrender` 拆成独立 chunk，业务 chunk 从 507 kB 降到 3.9 kB；这两个包 hash 稳定，改业务代码不会让用户重新下载 500 kB。
- **没有拆 `vant`**：它内部 `import vue`，单独拆会与 `index` chunk 形成循环依赖。

需要说清的一点：分包本身**不减字节**（507 kB → 509 kB），它解决的是「单 chunk 过大」和缓存粒度；真正减字节的是按需引入。两件事分开看。

## 项目亮点

- **把静态数据改造成真接口**：前后端共用一份 `data/destinations.json`，接口只返回图片键名，前端用 `toDestination()` 做 DTO → 视图模型映射。前端侧用模块级共享状态 + 单飞（single-flight），首页/列表/详情只发一次请求，并实现骨架屏、错误重试、开发期降级三种状态（生产环境不降级、如实报错）。
- **SSE 流式对话**：自己实现分帧解析器（按行缓冲、多行 `data:` 合并、兼容 `\r\n`），支持随时中断；中断时 `AbortController` 断前端连接，服务端 `res.on('close')` 同步取消上游请求，避免白烧 token。
- **全量 TypeScript**：组件层全部 `lang="ts"`，筛选排序、SSE 分帧、DTO 映射抽成不依赖 DOM 的纯函数，**28 条单测**跑在 node 环境（不需要 jsdom）；CI 里 lint → type-check → test → build 四道闸。
- **可量化的性能优化**：图片经「缩放 → WebP → 按收益决策 → 去重」后从 15.2 MB 降到 2.84 MB（-81%）；图表路由 gzip 从 351 kB 降到 173 kB，单 chunk 从 1,056 kB 降到 336 kB 且构建无警告。
- **状态与 URL 同步**：筛选、排序、关键词写进 query，链接可分享、返回不丢状态；收藏用 localStorage + 跨标签页 `storage` 事件同步。

## 部署

前端与后端分开部署（后端要跑常驻的 Express 进程）。

**1. 前端 → Vercel**

导入仓库后 Vercel 会自动识别 Vite，`vercel.json` 已配好 SPA 回退（否则刷新 `/destination/bali` 会 404）。
在 Project Settings → Environment Variables 添加：

```
VITE_API_BASE_URL = https://<你的后端域名>
```

**2. 后端 → Render / Railway 等 Node 服务**

- Build Command：`npm install`
- Start Command：`npm run server`
- 环境变量：`AI_API_KEY`、`AI_MODEL`、`AI_BASE_URL`、`CORS_ORIGINS=https://<你的前端域名>`

`CORS_ORIGINS` 必须填前端域名，否则浏览器会把请求拦下来（本地 localhost 已默认放行）。

部署后自检：访问 `https://<后端域名>/api/health`，应返回 `{"ok":true,...}`。

## 常见问题

**页面提示「连不上后端服务」，终端出现 `ECONNREFUSED`**
后端没在跑。另开一个终端执行 `npm run server`，看到 `[server] AI 助手已启动` 即可；
也可直接访问 http://localhost:3000/api/health 自检（应返回 `{"ok":true,...}`）。

**`npm run server` 一闪而过，提示「缺少 AI_API_KEY」**
`.env.local` 不存在或变量名不对（必须是 `AI_API_KEY=`）。从 `.env.example` 复制一份即可。

**502 / 「AI 服务鉴权失败」**
Key 无效或已被吊销。去控制台重新生成，更新 `.env.local` 后**重启后端**（改环境变量不会热更新）。

**429**
触发了服务端限流（每 IP 每分钟 20 次）或上游限流，等一分钟再试。

**`EADDRINUSE` 端口被占用**
`Get-NetTCPConnection -LocalPort 3000` 查占用进程；或改 `.env.local` 里的 `PORT`，
并同步修改 `vite.config.js` 中代理的 `target`。

## 说明

全部图片与目的地数据为演示用静态素材，仅用于展示交互与工程实现。