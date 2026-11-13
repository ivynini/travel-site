import { describe, expect, it } from 'vitest'
import { categories, destinations, toDestination } from '../src/data/destinations'
import type { DestinationDTO } from '../src/types'

const dto: DestinationDTO = {
  id: 'sample',
  name: '示例目的地',
  subtitle: '',
  location: '',
  category: '海岛度假',
  tag: '',
  price: 100,
  days: 1,
  bestSeason: '',
  hot: false,
  description: '',
  coverKey: 'bali1',
  galleryKeys: ['bali1', 'kyoto1'],
  highlights: [],
  tips: [],
}

describe('toDestination（DTO → 视图模型）', () => {
  it('把图片键名映射成真实地址，并去掉键名字段', () => {
    const item = toDestination(dto)

    expect(item.cover).not.toBe('bali1')
    expect(item.cover.length).toBeGreaterThan(0)
    expect(item.gallery).toHaveLength(2)
    expect(item.gallery).not.toEqual(['bali1', 'kyoto1'])
    expect('coverKey' in item).toBe(false)
  })

  it('未知键名返回空串，而不是 undefined', () => {
    const item = toDestination({ ...dto, coverKey: 'not-exist', galleryKeys: ['not-exist'] })

    expect(item.cover).toBe('')
    expect(item.gallery).toEqual([''])
  })

  it('本地兜底数据全部映射成功（没有漏配图片）', () => {
    expect(destinations.length).toBeGreaterThan(0)
    expect(destinations.every((item) => item.cover.length > 0)).toBe(true)
    expect(destinations.every((item) => item.gallery.length > 0)).toBe(true)
  })
})

describe('categories', () => {
  it('由数据推导，首个是「全部分类」占位', () => {
    expect(categories[0]).toBe('全部')
    expect(categories.length).toBeGreaterThan(1)
  })
})