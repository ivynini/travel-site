import { describe, expect, it } from 'vitest'
import { createSSEParser, type SSEEvent } from '../src/api/sse'

/** 收集解析结果，省掉每个用例重复写回调 */
function collect() {
  const events: SSEEvent[] = []
  const parser = createSSEParser((event) => events.push(event))
  return { events, parser }
}

describe('createSSEParser', () => {
  it('解析一帧 event + JSON data', () => {
    const { events, parser } = collect()

    parser.push('event: delta\ndata: {"text":"你好"}\n\n')

    expect(events).toEqual([{ event: 'delta', data: { text: '你好' } }])
  })

  it('一帧被拆到多个 chunk 时，等数据齐了才发出', () => {
    const { events, parser } = collect()

    parser.push('event: delta\ndata: {"te')
    expect(events).toHaveLength(0)

    parser.push('xt":"分块"}\n')
    expect(events).toHaveLength(0)

    parser.push('\n')
    expect(events).toEqual([{ event: 'delta', data: { text: '分块' } }])
  })

  it('一个 chunk 里包含多帧时逐帧发出', () => {
    const { events, parser } = collect()

    parser.push(
      'event: delta\ndata: {"text":"A"}\n\n' + 'event: delta\ndata: {"text":"B"}\n\n'
    )

    expect(events.map((item) => (item.data as { text: string }).text)).toEqual(['A', 'B'])
  })

  it('忽略注释帧（keep-alive）', () => {
    const { events, parser } = collect()

    parser.push(': ping\n\n')
    expect(events).toHaveLength(0)

    parser.push('event: done\ndata: {}\n\n')
    expect(events).toEqual([{ event: 'done', data: {} }])
  })

  it('兼容 CRLF 换行', () => {
    const { events, parser } = collect()

    parser.push('event: delta\r\ndata: {"text":"A"}\r\n\r\n')

    expect(events).toEqual([{ event: 'delta', data: { text: 'A' } }])
  })

  it('没有 event 字段时默认 event 为 message', () => {
    const { events, parser } = collect()

    parser.push('data: hello\n\n')

    expect(events).toEqual([{ event: 'message', data: 'hello' }])
  })

  it('非 JSON 的 data 保留原始字符串', () => {
    const { events, parser } = collect()

    parser.push('data: [不是JSON\n\n')

    expect(events).toEqual([{ event: 'message', data: '[不是JSON' }])
  })

  it('多行 data 用换行拼接', () => {
    const { events, parser } = collect()

    parser.push('data: 第一行\ndata: 第二行\n\n')

    expect(events).toEqual([{ event: 'message', data: '第一行\n第二行' }])
  })

  it('flush 处理没有空行收尾的最后一帧', () => {
    const { events, parser } = collect()

    parser.push('event: done\ndata: {"completed":true}')
    expect(events).toHaveLength(0)

    parser.flush()

    expect(events).toEqual([{ event: 'done', data: { completed: true } }])
  })

  it('相邻两帧的 event 名字不会互相污染', () => {
    const { events, parser } = collect()

    parser.push('event: delta\ndata: {"text":"A"}\n\ndata: {"text":"B"}\n\n')

    expect(events).toEqual([
      { event: 'delta', data: { text: 'A' } },
      { event: 'message', data: { text: 'B' } },
    ])
  })
})