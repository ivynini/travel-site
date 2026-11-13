/** 全站共享类型 */

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface Destination {
  id: string
  name: string
  subtitle: string
  location: string
  category: string
  tag: string
  price: number
  days: number
  bestSeason: string
  hot: boolean
  description: string
  cover: string
  gallery: string[]
  highlights: string[]
  tips: string[]
}

/**
 * 接口返回的原始结构（DTO）
 *
 * 与视图模型 `Destination` 的唯一区别：图片只给键名，由前端映射成打包后的地址。
 * 这样后端不需要知道前端资源怎么组织，前端换图也不用改接口。
 */
export interface DestinationDTO
  extends Omit<Destination, 'cover' | 'gallery'> {
  coverKey: string
  galleryKeys: string[]
}

export type SortKey = 'default' | 'price-asc' | 'price-desc' | 'days-desc'

export interface SortOption {
  value: SortKey
  label: string
}

export interface DestinationQuery {
  keyword?: string
  category?: string
  sort?: SortKey
  onlyFavorites?: boolean
  /** 已收藏的 id 列表，配合 onlyFavorites 使用 */
  favorites?: string[]
}