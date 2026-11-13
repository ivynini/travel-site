/**
 * 目的地列表的筛选 / 排序逻辑
 *
 * 单独抽成纯函数的原因：
 * 1. 组件里只剩「把状态传进来」这一件事，逻辑可读性更好
 * 2. 纯函数可以直接单测（tests/filter.spec.ts），不需要挂载组件
 */
import type { Destination, DestinationQuery, SortKey, SortOption } from '../types'

export const ALL_CATEGORY = '全部'

export const SORT_OPTIONS: SortOption[] = [
  { value: 'default', label: '推荐排序' },
  { value: 'price-asc', label: '价格从低到高' },
  { value: 'price-desc', label: '价格从高到低' },
  { value: 'days-desc', label: '行程天数最多' },
]

const SORT_KEYS: SortKey[] = ['default', 'price-asc', 'price-desc', 'days-desc']

/** 判断一个字符串是否是合法的排序方式（URL 参数来自外部，必须校验） */
export function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (SORT_KEYS as string[]).includes(value)
}

/**
 * 按关键词 / 分类 / 收藏过滤，再排序。
 * 始终返回新数组，不修改入参。
 */
export function filterDestinations(
  list: Destination[],
  query: DestinationQuery = {}
): Destination[] {
  const keyword = (query.keyword ?? '').trim().toLowerCase()
  const category = query.category ?? ALL_CATEGORY
  const favorites = query.favorites ?? []

  const matched = list.filter((item) => {
    if (query.onlyFavorites && !favorites.includes(item.id)) return false
    if (category !== ALL_CATEGORY && item.category !== category) return false
    if (!keyword) return true

    return [item.name, item.location, item.category, item.subtitle, item.description]
      .join(' ')
      .toLowerCase()
      .includes(keyword)
  })

  const sorted = [...matched]

  switch (query.sort) {
    case 'price-asc':
      sorted.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      sorted.sort((a, b) => b.price - a.price)
      break
    case 'days-desc':
      sorted.sort((a, b) => b.days - a.days)
      break
    default:
      break
  }

  return sorted
}