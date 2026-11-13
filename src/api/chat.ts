/**
 * AI 对话接口封装
 *
 * - 页面组件不关心 URL、SSE 协议细节与错误映射
 * - 开发环境留空走 Vite 代理（/api → localhost:3000），线上用 VITE_API_BASE_URL
 */
import { createSSEParser } from './sse'
import { isAbortError } from './abort'
import type { ChatMessage } from '../types'

export { isAbortError }

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '')

/** 统一的接口错误：status 为 0 表示根本没连上后端 */
export class ChatError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'ChatError'
    this.status = status
  }
}

/** 模型开始调用一个工具 */
export interface ToolStep {
  tool: string
  args: Record<string, unknown>
}

/** 工具执行结束 */
export interface ToolStepResult {
  tool: string
  ok: boolean
  error: string | null
  summary: string
}

export interface StreamChatOptions {
  messages: ChatMessage[]
  signal?: AbortSignal
  onDelta?: (text: string) => void
  onStep?: (step: ToolStep) => void
  onStepDone?: (result: ToolStepResult) => void
}

export interface StreamChatResult {
  completed: boolean
}

/**
 * 流式对话
 *
 * @returns 正常结束时 `{ completed: true }`；主动 abort 会抛出 AbortError 由调用方处理
 */
export async function streamChat({
  messages,
  signal,
  onDelta,
  onStep,
  onStepDone,
}: StreamChatOptions): Promise<StreamChatResult> {
  let response: Response

  try {
    response = await fetch(`${API_BASE}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ messages }),
      signal,
    })
  } catch (error) {
    // 主动中止要保持 AbortError，让调用方能区分「用户点了停止」和「网络故障」
    if (isAbortError(error)) throw error
    throw new ChatError('连不上后端服务，请确认已运行 npm run server', 0)
  }

  if (!response.ok) {
    let message = '请求失败，请稍后重试'
    try {
      const data = (await response.json()) as { error?: string }
      if (data.error) message = data.error
    } catch {
      // 响应不是 JSON（例如被网关拦截），用默认文案
    }
    throw new ChatError(message, response.status)
  }

  if (!response.body) {
    throw new ChatError('当前浏览器不支持流式响应，请更换现代浏览器', 0)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  let streamError: string | null = null
  let completed = false

  const parser = createSSEParser(({ event, data }) => {
    if (event === 'delta') {
      const payload = data as { text?: string } | string
      const text = typeof payload === 'string' ? payload : payload?.text
      if (text) onDelta?.(text)
      return
    }

    if (event === 'step') {
      const payload = data as ToolStep | string
      if (typeof payload !== 'string') onStep?.(payload)
      return
    }

    if (event === 'step_done') {
      const payload = data as ToolStepResult | string
      if (typeof payload !== 'string') onStepDone?.(payload)
      return
    }

    if (event === 'error') {
      const payload = data as { message?: string } | string
      streamError = (typeof payload === 'string' ? payload : payload?.message) ?? 'AI 服务出错，请重试'
      return
    }

    if (event === 'done') completed = true
  })

  for (;;) {
    const { value, done } = await reader.read()
    if (done || !value) break
    parser.push(decoder.decode(value, { stream: true }))
  }
  parser.flush()

  if (streamError) throw new ChatError(streamError, 200)

  return { completed }
}