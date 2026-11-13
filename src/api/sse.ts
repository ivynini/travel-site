/**
 * 极简 SSE（text/event-stream）解析器
 *
 * 为什么需要自己写：EventSource 只支持 GET、无法带 JSON body，
 * 所以流式对话只能用 fetch + ReadableStream 手工解析。
 *
 * 难点在于网络分块与协议帧并不对齐：
 *   - 一个 chunk 可能只包含半行（"data: {\"te"），也可能包含多个完整帧
 *   - 中文是多字节字符，chunk 边界可能正好切在一个汉字中间
 * 因此这里按「行」缓冲，只有读到完整的 '\n' 才解析，其余留在 buffer 里等下一块。
 */

export interface SSEEvent {
  event: string
  /** data 行能解析成 JSON 时是对象/数组，否则是原始字符串 */
  data: unknown
}

export type SSEListener = (event: SSEEvent) => void

export interface SSEParser {
  push(chunk: string): void
  flush(): void
}

export function createSSEParser(onEvent: SSEListener): SSEParser {
  let buffer = ''
  let eventName = 'message'
  let dataLines: string[] = []

  const dispatch = () => {
    if (!dataLines.length) {
      eventName = 'message'
      return
    }

    const raw = dataLines.join('\n')
    const name = eventName

    dataLines = []
    eventName = 'message'

    let data: unknown = raw
    if (raw.startsWith('{') || raw.startsWith('[')) {
      try {
        data = JSON.parse(raw)
      } catch {
        // 不是合法 JSON 就保持原文，交由调用方处理
      }
    }

    onEvent({ event: name, data })
  }

  const handleLine = (line: string) => {
    // 以 ':' 开头的是注释，常用于 keep-alive，直接忽略
    if (line.startsWith(':')) return

    const colonIndex = line.indexOf(':')
    const field = colonIndex === -1 ? line : line.slice(0, colonIndex)
    let value = colonIndex === -1 ? '' : line.slice(colonIndex + 1)
    if (value.startsWith(' ')) value = value.slice(1)

    if (field === 'event') eventName = value
    else if (field === 'data') dataLines.push(value)
  }

  return {
    /** 喂入一段文本（可以是不完整的一帧） */
    push(chunk: string) {
      buffer += chunk

      let index = buffer.indexOf('\n')
      while (index !== -1) {
        const line = buffer.slice(0, index).replace(/\r$/, '')
        buffer = buffer.slice(index + 1)

        if (line === '') dispatch()
        else handleLine(line)

        index = buffer.indexOf('\n')
      }
    },

    /** 流结束时调用，处理没有以空行收尾的最后一帧 */
    flush() {
      if (buffer) {
        const line = buffer.replace(/\r$/, '')
        buffer = ''
        if (line !== '') handleLine(line)
      }
      dispatch()
    },
  }
}