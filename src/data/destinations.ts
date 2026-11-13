/**
 * 目的地数据源
 *
 * 唯一数据源是项目根目录的 `data/destinations.json`：
 * - 前端：直接 import 这份 JSON 做本地兜底（后端没起时页面也能用）
 * - 后端：`GET /api/destinations` 原样返回同一份数据
 *
 * 接口里的图片是键名（`coverKey` / `galleryKeys`），
 * 由 `toDestination()` 统一映射成打包后的真实 URL —— 这就是 DTO 与视图模型的边界。
 */
import raw from '../../data/destinations.json'
import { resolveImage } from './images'
import type { Destination, DestinationDTO } from '../types'

/** DTO → 视图模型 */
export function toDestination({ coverKey, galleryKeys, ...rest }: DestinationDTO): Destination {
  return {
    ...rest,
    cover: resolveImage(coverKey),
    gallery: galleryKeys.map(resolveImage),
  }
}

/** 本地兜底数据（mock），与接口返回结构一致 */
export const destinations: Destination[] = (raw as DestinationDTO[]).map(toDestination)

/** 分类由数据推导，避免再加一个手写数组 */
export const categories: string[] = [
  '全部',
  ...new Set(destinations.map((item) => item.category)),
]

/** 首页展示的热门目的地 */
export const hotDestinations: Destination[] = destinations.filter((item) => item.hot)

/** 按 id 查询，详情页使用；路由参数可能是数组，统一取第一个 */
export function findDestination(id: string | readonly string[] | undefined): Destination | null {
  return findInList(destinations, id)
}

/** 在给定列表里按 id 查找（接口数据接入后，列表不再固定来自本地） */
export function findInList(
  list: Destination[],
  id: string | readonly string[] | undefined
): Destination | null {
  const target = Array.isArray(id) ? id[0] : id
  if (!target) return null
  return list.find((item) => item.id === target) ?? null
}

/** 同分类推荐，排除自身；优先同分类，不足再补其他分类 */
export function relatedDestinations(
  item: Destination | null | undefined,
  list: Destination[] = destinations,
  limit = 3
): Destination[] {
  if (!item) return []

  const sameCategory = list.filter((i) => i.id !== item.id && i.category === item.category)
  const others = list.filter((i) => i.id !== item.id && i.category !== item.category)

  return [...sameCategory, ...others].slice(0, limit)
}

/** 价格展示：4580 → 4,580 */
export function formatPrice(value: number): string {
  return Number(value).toLocaleString('zh-CN')
}