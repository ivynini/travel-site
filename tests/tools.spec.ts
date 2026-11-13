import { describe, expect, it } from 'vitest'
import raw from '../data/destinations.json'
import {
  buildToolDefinitions,
  estimateBudget,
  getDestinationDetail,
  runTool,
  searchDestinations,
} from '../server/tools.mjs'

const list = raw

/**
 * 工具层是纯 .mjs（服务端不引入构建步骤），没有类型声明，
 * 返回值会是 any 并一路传染到 map/every 的回调参数上。
 * 所以在测试边界统一收口成结构类型：any 只出现在下面这四个函数里。
 */
interface SearchHit {
  id: string
  price: number
  days: number
}

interface SearchResult {
  total: number
  returned: number
  items: SearchHit[]
}

interface Detail {
  name: string
  highlights: string[]
  tips: string[]
}

interface Budget {
  perPerson: number
  total: number
  travelers: number
  days: number
  currency: string
}

interface ToolOutcome {
  ok: boolean
  error?: string
  result?: SearchResult
}

interface ToolDefinition {
  function: {
    name: string
    parameters: { required?: string[]; properties: Record<string, { description?: string }> }
  }
}

const search = (args?: Record<string, unknown>): SearchResult =>
  searchDestinations(list, args) as unknown as SearchResult

const detailOf = (args: Record<string, unknown>): Detail =>
  getDestinationDetail(list, args) as unknown as Detail

const budgetOf = (args: Record<string, unknown>): Budget =>
  estimateBudget(list, args) as unknown as Budget

const call = (name: string, args: Record<string, unknown>): ToolOutcome =>
  runTool(name, args, list) as unknown as ToolOutcome

describe('searchDestinations', () => {
  it('按名称命中', () => {
    const result = search({ keyword: '京都' })

    expect(result.total).toBe(1)
    expect(result.items[0].id).toBe('kyoto')
  })

  it('按国家命中（问「日本」应同时给出京都和樱花季）', () => {
    const result = search({ keyword: '日本' })
    const ids = result.items.map((item) => item.id).sort()

    expect(result.total).toBe(2)
    expect(ids).toEqual(['kyoto', 'sakura'])
  })

  it('按分类过滤，并按价格升序返回', () => {
    const result = search({ category: '海岛度假' })
    const prices = result.items.map((item) => item.price)

    expect(result.total).toBe(3)
    expect(result.items.map((item) => item.id)).toEqual(['bali', 'santorini', 'maldives'])
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
  })

  it('预算上限是闭区间（5000 元能覆盖 4580）', () => {
    const result = search({ maxPrice: 5000 })

    expect(result.items.map((item) => item.id)).toEqual(['yunnan', 'bali'])
  })

  it('按天数上限过滤', () => {
    const result = search({ maxDays: 5 })

    expect(result.total).toBe(2)
    expect(result.items.every((item) => item.days <= 5)).toBe(true)
  })

  it('默认返回 5 条，limit 上限被钳到 10', () => {
    const byDefault = search({})
    const oversized = search({ limit: 99 })

    expect(byDefault.total).toBe(list.length)
    expect(byDefault.returned).toBe(5)
    expect(oversized.returned).toBe(10)
    expect(oversized.items).toHaveLength(10)
  })

  it('无匹配时返回空数组而不是报错', () => {
    const result = search({ maxPrice: 1000 })

    expect(result.total).toBe(0)
    expect(result.items).toEqual([])
  })

  it('不修改传入的数组（排序作用在副本上）', () => {
    const originalFirst = list[0].id

    search({})
    search({ limit: 2 })

    expect(list[0].id).toBe(originalFirst)
  })

  it('缺少参数时不崩溃', () => {
    const result = search()

    expect(result.total).toBe(list.length)
  })
})

describe('getDestinationDetail', () => {
  it('返回亮点与提示，但不返回图片键名（模型用不上，白占 token）', () => {
    const detail = detailOf({ id: 'bali' })
    const record = getDestinationDetail(list, { id: 'bali' }) as unknown as Record<string, unknown>

    expect(detail.name).toBe('巴厘岛')
    expect(detail.highlights.length).toBeGreaterThan(0)
    expect(detail.tips.length).toBeGreaterThan(0)
    expect('coverKey' in record).toBe(false)
    expect('galleryKeys' in record).toBe(false)
  })

  it('未知 id 抛错，由 runTool 转成可回填的错误信息', () => {
    expect(() => getDestinationDetail(list, { id: 'not-exist' })).toThrow(/not-exist/)
  })
})

describe('estimateBudget', () => {
  it('按人均每天折算到自定义天数，再乘人数', () => {
    // 巴厘岛 4580 元 / 5 天 → 每天 916 元；7 天 2 人 → 916 * 7 * 2
    const budget = budgetOf({ id: 'bali', travelers: 2, days: 7 })

    expect(budget.perPerson).toBe(6412)
    expect(budget.total).toBe(12824)
    expect(budget.currency).toBe('CNY')
  })

  it('不传人数与天数时沿用套餐口径', () => {
    const budget = budgetOf({ id: 'bali' })

    expect(budget.travelers).toBe(1)
    expect(budget.days).toBe(5)
    expect(budget.total).toBe(4580)
  })
})

describe('runTool', () => {
  it('未知工具返回错误而不是抛异常', () => {
    const result = call('no_such_tool', {})

    expect(result.ok).toBe(false)
    expect(result.error).toContain('未知工具')
  })

  it('执行器内部报错被捕获成 { ok: false }', () => {
    const result = call('get_destination_detail', { id: 'not-exist' })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('not-exist')
  })

  it('正常执行返回 { ok: true, result }', () => {
    const result = call('search_destinations', { keyword: '巴黎' })

    expect(result.ok).toBe(true)
    expect(result.result?.items[0].id).toBe('paris')
  })
})

describe('buildToolDefinitions', () => {
  it('声明三个工具，必填参数与数据一致', () => {
    const definitions = buildToolDefinitions(list) as unknown as ToolDefinition[]
    const findByName = (name: string) =>
      definitions.find((definition) => definition.function.name === name)

    expect(definitions).toHaveLength(3)
    expect(definitions.map((definition) => definition.function.name).sort()).toEqual([
      'estimate_budget',
      'get_destination_detail',
      'search_destinations',
    ])
    expect(findByName('get_destination_detail')?.function.parameters.required).toContain('id')
    // 分类用 description 提示，不在 schema 里写死 enum
    expect(
      findByName('search_destinations')?.function.parameters.properties.category?.description
    ).toContain('海岛度假')
  })
})