/**
 * 工具层（tool calling）
 *
 * 设计原则：
 * - **纯函数 + 数据注入**：所有函数接收「目的地列表」作为参数，不读文件、不发请求。
 *   这样单测不需要启后端，也不怕改数据；server.cjs 负责把 JSON 传进来。
 * - **工具返回精简数据**：模型不需要 coverKey/galleryKeys 这类渲染字段，
 *   给全量数据只会白烧 token 并干扰判断。
 * - **错误不抛给调用方，而是作为结果回填**：模型看到 { ok: false, error } 后可以自己改参数重试，
 *   这正是 agent 循环能自我纠错的前提。
 *
 * 用 .mjs（ESM）而不是 .cjs：Vitest 直接 import 就能测试；server.cjs 用 import() 动态加载。
 */

const DEFAULT_LIMIT = 5
const MAX_LIMIT = 10

const toNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const clampLimit = (value) => {
  const parsed = Math.floor(Number(value))
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

const lower = (value) => String(value ?? '').toLowerCase().trim()

/** 关键词命中：名称 / 国家 / 副标题 / 分类 / 标签 */
const matchesKeyword = (item, keyword) => {
  const query = lower(keyword)
  if (!query) return true
  return [item.name, item.location, item.subtitle, item.category, item.tag].some((field) =>
    lower(field).includes(query)
  )
}

/** 列表用的精简结构：去掉图片键名，亮点只留 2 条 */
const summarize = (item) => ({
  id: item.id,
  name: item.name,
  location: item.location,
  category: item.category,
  price: item.price,
  days: item.days,
  bestSeason: item.bestSeason,
  summary: item.description,
  highlights: (item.highlights ?? []).slice(0, 2),
})

/**
 * 按预算 / 天数 / 分类 / 关键词检索，结果按价格升序。
 * 返回 total（命中总数）与 returned（实际返回条数），让模型知道有没有被截断。
 */
export function searchDestinations(list, args = {}) {
  const limit = clampLimit(args?.limit)
  const category = String(args?.category ?? '').trim()
  const maxPrice = toNumber(args?.maxPrice)
  const maxDays = toNumber(args?.maxDays)

  const matched = list
    .filter((item) => matchesKeyword(item, args?.keyword))
    .filter((item) => !category || item.category === category)
    .filter((item) => maxPrice === undefined || item.price <= maxPrice)
    .filter((item) => maxDays === undefined || item.days <= maxDays)
    .sort((a, b) => a.price - b.price)

  return {
    total: matched.length,
    returned: Math.min(matched.length, limit),
    items: matched.slice(0, limit).map(summarize),
  }
}

/** 完整详情（仍不返回图片键名） */
export function getDestinationDetail(list, args = {}) {
  const id = String(args?.id ?? '').trim()
  if (!id) throw new Error('缺少必需参数 id')

  const item = list.find((entry) => entry.id === id)
  if (!item) throw new Error(`没有找到 id 为「${id}」的目的地`)

  return {
    id: item.id,
    name: item.name,
    subtitle: item.subtitle,
    location: item.location,
    category: item.category,
    price: item.price,
    days: item.days,
    bestSeason: item.bestSeason,
    description: item.description,
    highlights: item.highlights ?? [],
    tips: item.tips ?? [],
  }
}

/**
 * 费用估算：套餐价按「人均每天」折算到用户的天数，再乘人数。
 * 报价口径写进 note，避免模型把估算说成精确报价。
 */
export function estimateBudget(list, args = {}) {
  const detail = getDestinationDetail(list, args)

  const travelers = Math.max(1, Math.floor(toNumber(args?.travelers) ?? 1))
  const days = Math.max(1, Math.floor(toNumber(args?.days) ?? detail.days))
  const perPerson = Math.round((detail.price / detail.days) * days)

  return {
    destination: detail.name,
    basePrice: detail.price,
    baseDays: detail.days,
    travelers,
    days,
    perPerson,
    total: perPerson * travelers,
    currency: 'CNY',
    note: `${detail.price} 元/人 是 ${detail.days} 天套餐的报价，这里按人均每天等比折算，仅作预算参考`,
  }
}

/** 工具名 → 执行器 */
export const TOOL_HANDLERS = {
  search_destinations: searchDestinations,
  get_destination_detail: getDestinationDetail,
  estimate_budget: estimateBudget,
}

/**
 * 生成 OpenAI 兼容的 tools 声明。
 * 分类用 description 提示而不是 enum：数据加了分类不用改 schema。
 */
export function buildToolDefinitions(list = []) {
  const categories = [...new Set(list.map((item) => item.category))]
  const categoryHint = categories.length
    ? `分类可选：${categories.join('、')}`
    : '分类可选：见目的地数据'

  return [
    {
      type: 'function',
      function: {
        name: 'search_destinations',
        description:
          '按预算、天数、分类或关键词搜索旅行目的地，返回精简结果列表（按价格升序）。用户问「去哪」「有什么推荐」「预算内能去哪」时先调用它。',
        parameters: {
          type: 'object',
          properties: {
            keyword: {
              type: 'string',
              description: '目的地名称、国家或关键词，如「京都」「日本」「海岛」',
            },
            category: { type: 'string', description: categoryHint },
            maxPrice: { type: 'number', description: '人均预算上限（元），含等于' },
            maxDays: { type: 'number', description: '可出行天数上限' },
            limit: {
              type: 'number',
              description: `返回条数，默认 ${DEFAULT_LIMIT}，最多 ${MAX_LIMIT}`,
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'get_destination_detail',
        description:
          '获取某个目的地的完整信息（亮点、实用提示、最佳季节）。用户追问细节或要做行程安排时调用。',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: '目的地 id，取自 search_destinations 的结果',
            },
          },
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'estimate_budget',
        description:
          '按人数和天数估算某个目的地的总花费。用户关心「多少钱」「预算够不够」时调用。',
        parameters: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: '目的地 id' },
            travelers: { type: 'number', description: '出行人数，默认 1' },
            days: { type: 'number', description: '计划天数，默认沿用套餐天数' },
          },
        },
      },
    },
  ]
}

/**
 * 执行工具，永不抛异常：
 * 成功返回 { ok: true, result }，失败返回 { ok: false, error }，由调用方回填给模型。
 */
export function runTool(name, args, list) {
  const handler = TOOL_HANDLERS[name]
  if (!handler) {
    return {
      ok: false,
      error: `未知工具「${name}」，可用工具：${Object.keys(TOOL_HANDLERS).join('、')}`,
    }
  }

  try {
    return { ok: true, result: handler(list, args ?? {}) }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}