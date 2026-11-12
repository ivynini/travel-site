/**
 * 叮叮车旅游网 —— AI 旅行助手后端
 *
 * 单文件 Express 服务：接收前端提交的对话历史，转发给大模型并返回回复。
 * 启动：npm run server
 * 配置：复制 .env.example 为 .env.local 并填入 Key（不要提交到仓库）
 */
const express = require('express')
const cors = require('cors')
const axios = require('axios')
const dotenv = require('dotenv')

// .env.local 优先于 .env，便于本机覆盖而不改动默认配置
dotenv.config({ path: ['.env.local', '.env'] })

const PORT = Number(process.env.PORT) || 3000
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '')
const AI_MODEL = process.env.AI_MODEL || 'deepseek-chat'
const AI_API_KEY = process.env.AI_API_KEY
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 30000

const MAX_HISTORY = 12 // 最多携带的历史条数，控制 token 成本
const MAX_CONTENT_LEN = 2000 // 单条消息最大长度
const RATE_LIMIT = { windowMs: 60 * 1000, max: 20 } // 每个 IP 每分钟最多 20 次

const SYSTEM_PROMPT = [
  '你是「叮叮车旅游网」的 AI 旅行助手，为用户提供专业、可执行的旅行建议。',
  '回答要求：',
  '1. 只回答旅行相关问题：目的地、行程规划、交通、住宿、美食、签证、预算等；',
  '2. 建议要具体，涉及价格时说明这是估算区间；',
  '3. 使用中文，条理清晰，可用短列表，控制在 400 字以内；',
  '4. 不确定的信息要明确说明，不要编造景点、价格或签证政策。',
].join('\n')

if (!AI_API_KEY) {
  console.error('\n[启动失败] 缺少 AI_API_KEY。')
  console.error('  1) 复制 .env.example 为 .env.local')
  console.error('  2) 在 https://platform.deepseek.com 申请 Key 后填入 AI_API_KEY=')
  console.error('  3) Key 只放在 .env.local 中，该文件已被 .gitignore 忽略\n')
  process.exit(1)
}

const app = express()

// 仅允许本地开发端口与显式配置的前端域名访问
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true) // 同源 / curl
      if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return callback(null, true)
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
      return callback(new Error('CORS: origin not allowed'))
    },
  })
)
app.use(express.json({ limit: '64kb' }))

/* ── 简易限流：滑动窗口，避免前端失控或被人恶意刷接口 ── */
const hits = new Map()
const hitCleanup = setInterval(() => {
  const now = Date.now()
  for (const [ip, times] of hits) {
    const alive = times.filter((t) => now - t < RATE_LIMIT.windowMs)
    if (alive.length) hits.set(ip, alive)
    else hits.delete(ip)
  }
}, RATE_LIMIT.windowMs)
hitCleanup.unref()

function rateLimiter(req, res, next) {
  const ip = req.ip || 'unknown'
  const now = Date.now()
  const times = (hits.get(ip) || []).filter((t) => now - t < RATE_LIMIT.windowMs)
  if (times.length >= RATE_LIMIT.max) {
    return res.status(429).json({ error: '请求过于频繁，请稍后再试' })
  }
  times.push(now)
  hits.set(ip, times)
  next()
}

/**
 * 校验并清洗前端传来的对话历史。
 * - 只接受 user / assistant 两种角色，忽略非法字段（防止把 system 提示词从外部注入）
 * - 合并连续重复消息，防止同一条消息被提交两次
 * - 截断过长内容与历史长度
 */
function normalizeMessages(raw) {
  if (!Array.isArray(raw)) return null
  const cleaned = []

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const role = item.role === 'user' || item.role === 'assistant' ? item.role : null
    const content = typeof item.content === 'string' ? item.content.trim() : ''
    if (!role || !content) continue

    const prev = cleaned[cleaned.length - 1]
    if (prev && prev.role === role && prev.content === content) continue

    cleaned.push({ role, content: content.slice(0, MAX_CONTENT_LEN) })
  }

  // 必须以用户的新问题结尾，否则说明请求不完整
  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') return null
  return cleaned.slice(-MAX_HISTORY)
}

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: AI_MODEL, upstream: AI_BASE_URL })
})

app.post('/api/ai/chat', rateLimiter, async (req, res) => {
  const messages = normalizeMessages(req.body?.messages)
  if (!messages) {
    return res.status(400).json({ error: '请求格式不正确：messages 必须是非空数组且以用户消息结尾' })
  }

  try {
    const { data } = await axios.post(
      `${AI_BASE_URL}/chat/completions`,
      {
        model: AI_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.7,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: AI_TIMEOUT_MS,
      }
    )

    const reply = data?.choices?.[0]?.message?.content?.trim()
    if (!reply) {
      return res.status(502).json({ error: 'AI 返回内容为空，请重试' })
    }
    res.json({ reply, usage: data.usage ?? null })
  } catch (err) {
    const status = err.response?.status
    console.error('[AI] 上游请求失败:', status || err.code, err.message)

    if (status === 401 || status === 403) {
      return res.status(502).json({ error: 'AI 服务鉴权失败，请检查服务端 API Key 配置' })
    }
    if (status === 429) {
      return res.status(429).json({ error: 'AI 服务繁忙，请稍后再试' })
    }
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'AI 服务响应超时，请重试' })
    }
    res.status(500).json({ error: 'AI 服务暂时不可用，请稍后再试' })
  }
})

app.use((req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// 统一错误出口：CORS 拒绝、JSON 解析失败等都会落到这里
app.use((err, req, res, next) => {
  console.error('[server] 未捕获错误:', err.message)
  if (res.headersSent) return next(err)
  res.status(err.status || 400).json({ error: '请求处理失败' })
})

app.listen(PORT, () => {
  console.log(`[server] AI 助手已启动: http://localhost:${PORT}`)
  console.log(`[server] 模型: ${AI_MODEL} | 上游: ${AI_BASE_URL}`)
})