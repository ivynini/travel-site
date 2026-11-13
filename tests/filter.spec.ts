import { describe, expect, it } from 'vitest'
import { filterDestinations, isSortKey, ALL_CATEGORY } from '../src/data/filter'
import type { Destination } from '../src/types'

/** 只写关心的字段，其余给默认值，避免每个用例写一大堆无关字段 */
function make(overrides: Partial<Destination> & { id: string; name: string }): Destination {
  return {
    subtitle: '',
    location: '',
    category: '海岛度假',
    tag: '',
    price: 0,
    days: 1,
    bestSeason: '',
    hot: false,
    description: '',
    cover: '',
    gallery: [],
    highlights: [],
    tips: [],
    ...overrides,
  }
}

const list: Destination[] = [
  make({ id: 'bali', name: '巴厘岛', location: '印度尼西亚', price: 4580, days: 5 }),
  make({
    id: 'kyoto',
    name: '京都',
    location: '日本',
    category: '文化之旅',
    price: 5980,
    days: 6,
    description: '伏见稻荷的千本鸟居',
  }),
  make({
    id: 'maldives',
    name: '马尔代夫',
    location: '马尔代夫',
    price: 12800,
    days: 7,
    description: '浮潜看蝠鲼',
  }),
]

describe('filterDestinations', () => {
  it('无条件时返回全部，且不是同一个数组引用', () => {
    const result = filterDestinations(list)

    expect(result).toHaveLength(3)
    expect(result).not.toBe(list)
  })

  it('按名称关键词过滤', () => {
    const result = filterDestinations(list, { keyword: '巴厘' })
    expect(result.map((item) => item.id)).toEqual(['bali'])
  })

  it('关键词同样匹配地点与描述', () => {
    expect(filterDestinations(list, { keyword: '日本' }).map((i) => i.id)).toEqual(['kyoto'])
    expect(filterDestinations(list, { keyword: '浮潜' }).map((i) => i.id)).toEqual(['maldives'])
  })

  it('关键词忽略大小写与首尾空格', () => {
    const withLatin = [...list, make({ id: 'nz', name: 'New Zealand', location: 'NZ' })]

    expect(filterDestinations(withLatin, { keyword: '  new  ' }).map((i) => i.id)).toEqual(['nz'])
  })

  it('按分类过滤', () => {
    expect(filterDestinations(list, { category: '文化之旅' }).map((i) => i.id)).toEqual(['kyoto'])
  })

  it('分类为「全部」时不过滤', () => {
    expect(filterDestinations(list, { category: ALL_CATEGORY })).toHaveLength(3)
  })

  it('只看收藏', () => {
    const result = filterDestinations(list, {
      onlyFavorites: true,
      favorites: ['maldives', 'bali'],
    })

    expect(result.map((i) => i.id)).toEqual(['bali', 'maldives'])
  })

  it('只收藏时，收藏列表为空则返回空数组', () => {
    expect(filterDestinations(list, { onlyFavorites: true, favorites: [] })).toEqual([])
  })

  it('价格升序 / 降序', () => {
    expect(filterDestinations(list, { sort: 'price-asc' }).map((i) => i.price)).toEqual([
      4580, 5980, 12800,
    ])
    expect(filterDestinations(list, { sort: 'price-desc' }).map((i) => i.price)).toEqual([
      12800, 5980, 4580,
    ])
  })

  it('按行程天数降序', () => {
    expect(filterDestinations(list, { sort: 'days-desc' }).map((i) => i.days)).toEqual([7, 6, 5])
  })

  it('排序不会修改入参的顺序', () => {
    const before = list.map((i) => i.id)

    filterDestinations(list, { sort: 'price-desc' })

    expect(list.map((i) => i.id)).toEqual(before)
  })

  it('无匹配结果时返回空数组', () => {
    expect(filterDestinations(list, { keyword: '不存在的目的地' })).toEqual([])
  })
})

describe('isSortKey', () => {
  it('识别合法排序值', () => {
    expect(isSortKey('price-asc')).toBe(true)
    expect(isSortKey('default')).toBe(true)
  })

  it('拒绝非法值（URL 参数可能被随意篡改）', () => {
    expect(isSortKey('price')).toBe(false)
    expect(isSortKey(undefined)).toBe(false)
    expect(isSortKey(['price-asc'])).toBe(false)
  })
})