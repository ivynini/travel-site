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
const { TextDecoder } = require('node:util')

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
  '4. 不确定的信息要明确说明，不要编造景点、价格或签证政策；',
  '5. 涉及本站目的地、预算或天数时，先调用 search_destinations / get_destination_detail / estimate_budget 查真实数据，再基于返回结果回答；',
  '6. 工具没有查到的目的地就直说「本站暂未收录」，不要用印象里的价格凑答案；引用价格时说明是本站套餐报价的估算。',
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

/* ── 目的地数据：前端本地兜底与这里读的是同一份 JSON ── */
const DESTINATIONS = require('./data/destinations.json')

app.get('/api/destinations', (req, res) => {
  // 数据量小、几乎不变，给一个短缓存，省掉重复请求
  res.setHeader('Cache-Control', 'public, max-age=60')
  res.json({ items: DESTINATIONS, total: DESTINATIONS.length })
})

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

/**
 * 允许的「工具轮数」，由 AI_MAX_TOOL_ROUNDS 配置。
 *
 * 1 = 单轮工具调用：调一次工具 → 结果回填 → 再请求一次拿最终答案；
 * 3（默认）= 有界 agent：可以连续「搜索 → 估算 → 看详情」，最多 4 次上游请求。
 * 上限 5 是兜成本用的：每多一轮就多一次大模型调用。
 */
const MAX_TOOL_ROUNDS = Math.min(5, Math.max(1, Number(process.env.AI_MAX_TOOL_ROUNDS) || 3))

/** 模型给的 arguments 是 JSON 字符串，可能不合法；解析失败就交给工具层报「缺少参数」 */
function parseToolArgs(raw) {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

/** 给前端一句人话的步骤结果 */
function summarizeOutcome(outcome) {
  if (!outcome.ok) return outcome.error

  const result = outcome.result
  if (Array.isArray(result?.items)) return `找到 ${result.total} 个目的地`
  if (typeof result?.total === 'number') return `合计约 ${result.total} 元`
  if (result?.name) return `已获取「${result.name}」详情`
  return '已完成'
}

/**
 * 发起一次上游流式请求，边收边把增量文本交给 onDelta。
 *
 * 返回 { content, toolCalls }：
 * - content：拼好的完整文本（模型只回工具调用时为空）
 * - toolCalls：按 index 合并后的完整调用列表
 *
 * 为什么需要合并：stream 模式下 tool_calls 的 arguments 是**碎片化**下发的，
 * 一次调用可能被切成 `{"maxPrice":` / `5000}` 多段，必须按 index 累积后再 JSON.parse。
 */
async function streamCompletion({ messages, tools, toolChoice, signal, onDelta }) {
  const payload = {
    model: AI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 512,
    stream: true,
  }
  if (tools && tools.length) {
    payload.tools = tools
    // 最后一轮用 'none' 禁止再调用：history 里已经带着 tool_calls / tool 消息，
    // 有些兼容实现要求此时必须同时提供 tools，所以不能把 tools 摘掉。
    if (toolChoice) payload.tool_choice = toolChoice
  }

  const upstream = await axios.post(`${AI_BASE_URL}/chat/completions`, payload, {
    headers: {
      Authorization: `Bearer ${AI_API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    responseType: 'stream',
    timeout: AI_TIMEOUT_MS,
    signal,
  })

  let content = ''
  let buffer = ''
  const calls = new Map()
  const decoder = new TextDecoder('utf-8')

  // 按行解析上游 SSE 帧：一个 chunk 可能截断在多字节字符或换行中间，必须自己缓冲
  const handleLine = (line) => {
    if (!line.startsWith('data:')) return

    const raw = line.slice(5).trim()
    if (!raw || raw === '[DONE]') return

    let json
    try {
      json = JSON.parse(raw)
    } catch {
      return // 不完整帧直接跳过，不影响后续内容
    }

    const delta = json.choices?.[0]?.delta
    if (!delta) return

    if (delta.content) {
      content += delta.content
      onDelta?.(delta.content)
    }

    for (const fragment of delta.tool_calls ?? []) {
      const index = fragment.index ?? 0
      const merged = calls.get(index) ?? { id: '', name: '', arguments: '' }

      if (fragment.id) merged.id = fragment.id
      // 名称只在首个碎片里出现，之后只下发 arguments 片段，所以不做拼接
      if (!merged.name && fragment.function?.name) merged.name = fragment.function.name
      if (fragment.function?.arguments) merged.arguments += fragment.function.arguments

      calls.set(index, merged)
    }
  }

  await new Promise((resolve, reject) => {
    upstream.data.on('data', (chunk) => {
      buffer += decoder.decode(chunk, { stream: true })
      let index
      while ((index = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '')
        buffer = buffer.slice(index + 1)
        handleLine(line)
      }
    })

    upstream.data.on('end', () => {
      if (buffer) handleLine(buffer.replace(/\r$/, ''))
      resolve()
    })

    upstream.data.on('error', reject)
  })

  const toolCalls = [...calls.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, call]) => call)
    .filter((call) => call.name)

  return { content, toolCalls }
}

/**
 * 流式对话（SSE）
 *
 * 上游（OpenAI 兼容协议）返回的是它自己的 SSE 格式，这里做一层「协议归一化」，
 * 前端只需要认识这几种事件，不必了解上游字段结构：
 *   event: delta      data: {"text":"..."}                     增量文本
 *   event: step       data: {"tool":"...","args":{...}}        开始调用工具
 *   event: step_done  data: {"tool":"...","ok":true,"summary":"..."} 工具返回
 *   event: done       data: {"steps":[...]}                    正常结束
 *   event: error      data: {"message":"..."}                  出错（此时 HTTP 状态已是 200）
 */
app.post('/api/ai/chat/stream', rateLimiter, async (req, res) => {
  const messages = normalizeMessages(req.body?.messages)
  if (!messages) {
    return res.status(400).json({ error: '请求格式不正确：messages 必须是非空数组且以用户消息结尾' })
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no') // 关掉 nginx 等反向代理的缓冲，否则会攒够一批才吐
  res.flushHeaders?.()

  let finished = false

  const write = (event, data) => {
    if (finished || res.writableEnded) return
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const finish = (payload = {}) => {
    if (finished) return
    write('done', payload)
    finished = true
    res.end()
  }

  const fail = (message) => {
    if (finished) return
    write('error', { message })
    finished = true
    res.end()
  }

  // 前端点「停止」/ 关页面时，立刻掐断上游请求，别让模型继续算下去白花钱。
  // 注意用 res 的 close：正常结束时 finished 已经是 true，这里只处理提前断开的情况。
  const controller = new AbortController()
  let clientGone = false
  res.on('close', () => {
    if (finished) return
    clientGone = true
    controller.abort()
  })

  // 工具层是 ESM：动态 import 并缓存，避免每个请求都重新解析模块
  let cachedTools = null
  const loadTools = async () => {
    if (!cachedTools) cachedTools = await import('./server/tools.mjs')
    return cachedTools
  }

  try {
    const { buildToolDefinitions, runTool } = await loadTools()
    const toolDefinitions = buildToolDefinitions(DESTINATIONS)

    const history = [{ role: 'system', content: SYSTEM_PROMPT }, ...messages]
    const steps = []

    // 前 MAX_TOOL_ROUNDS 轮提供工具；之后不再提供，强制模型给出最终答案
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round += 1) {
      const allowTools = round < MAX_TOOL_ROUNDS

      const { content, toolCalls } = await streamCompletion({
        messages: history,
        tools: toolDefinitions,
        toolChoice: allowTools ? 'auto' : 'none',
        signal: controller.signal,
        onDelta: (text) => write('delta', { text }),
      })

      console.log(
        `[AI stream] 第 ${round + 1} 轮：allowTools=${allowTools}，文本 ${content.length} 字，工具调用 ${toolCalls.length} 个`
      )

      if (!toolCalls.length) {
        finish({ steps })
        return
      }

      // 把 assistant 的 tool_calls 原样回填：下一轮模型要靠 tool_call_id 对齐工具结果
      history.push({
        role: 'assistant',
        content: content || null,
        tool_calls: toolCalls.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: call.arguments || '{}' },
        })),
      })

      for (const call of toolCalls) {
        const args = parseToolArgs(call.arguments)
        write('step', { tool: call.name, args })

        const outcome = runTool(call.name, args, DESTINATIONS)
        const errorText = outcome.ok ? null : outcome.error

        steps.push({ tool: call.name, ok: outcome.ok })
        write('step_done', {
          tool: call.name,
          ok: outcome.ok,
          error: errorText,
          summary: summarizeOutcome(outcome),
        })

        // 失败也回填给模型（而不是中断请求），它可以根据提示改参数重试
        history.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(outcome.ok ? outcome.result : { error: errorText }),
        })
      }
    }

    // 轮数用尽仍在要求调用工具：收尾，避免无限循环
    finish({ steps, truncated: true })
  } catch (error) {
    if (clientGone || error.code === 'ERR_CANCELED') return

    const status = error.response?.status
    console.error('[AI stream] 上游请求失败:', status || error.code, error.message)

    if (status === 401 || status === 403) return fail('AI 服务鉴权失败，请检查服务端 API Key 配置')
    if (status === 429) return fail('AI 服务繁忙，请稍后再试')
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return fail('AI 服务响应超时，请重试')
    if (!error.response) return fail('AI 服务连接中断，请重试')
    fail('AI 服务暂时不可用，请稍后再试')
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