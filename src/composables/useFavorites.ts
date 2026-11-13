/**
 * 收藏状态（模块级单例 + localStorage 持久化）
 *
 * - 所有组件共享同一份响应式状态，任何地方切换收藏，列表 / 详情页 / 计数都会同步
 * - 持久化到 localStorage，刷新不丢；跨标签页通过 storage 事件同步
 * - 后续接入 Pinia 时，把 state 与 actions 搬过去即可，调用方式保持不变
 */
import { computed, reactive, watch, type ComputedRef } from 'vue'

const STORAGE_KEY = 'dingdingche:favorites'
const MAX_ITEMS = 50 // 防止异常写入把 localStorage 撑爆

function readFromStorage(): string[] {
  if (typeof localStorage === 'undefined') return []

  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(raw)) return []
    return raw.filter((id): id is string => typeof id === 'string')
  } catch (error) {
    console.warn('[favorites] 本地数据解析失败，已重置：', error)
    return []
  }
}

const state = reactive<{ ids: string[] }>({ ids: readFromStorage() })

watch(
  () => state.ids,
  (ids) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
    } catch (error) {
      console.warn('[favorites] 写入 localStorage 失败：', error)
    }
  },
  { deep: true }
)

// 多个标签页同时打开时保持一致
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    state.ids = readFromStorage()
  })
}

export interface FavoritesStore {
  ids: ComputedRef<string[]>
  count: ComputedRef<number>
  isFavorite: (id: string) => boolean
  toggle: (id: string) => void
  clear: () => void
}

export function useFavorites(): FavoritesStore {
  const ids = computed(() => state.ids)
  const count = computed(() => state.ids.length)

  const isFavorite = (id: string): boolean => state.ids.includes(id)

  const toggle = (id: string): void => {
    if (!id) return

    const index = state.ids.indexOf(id)
    if (index === -1) {
      // 最近收藏的排在前面，方便查看
      state.ids.unshift(id)
      if (state.ids.length > MAX_ITEMS) state.ids.pop()
    } else {
      state.ids.splice(index, 1)
    }
  }

  const clear = (): void => {
    state.ids.splice(0)
  }

  return { ids, count, isFavorite, toggle, clear }
}