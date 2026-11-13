/**
 * 目的地列表的共享状态
 *
 * 首页、列表页、详情页都要用同一份数据，所以状态放在模块级，
 * 并且用单飞（single-flight）保证并发调用只发一次请求：
 * 打开首页再点进详情页时，第二次 load() 直接复用结果。
 */
import { computed, reactive } from 'vue'
import { fetchDestinations, DestinationsError } from '@/api/destinations'
import type { Destination } from '@/types'

interface DestinationState {
  items: Destination[]
  loading: boolean
  error: string | null
  usedMock: boolean
  loaded: boolean
}

const state = reactive<DestinationState>({
  items: [],
  loading: false,
  error: null,
  usedMock: false,
  loaded: false,
})

let inflight: Promise<void> | null = null

export function useDestinations() {
  const load = (force = false): Promise<void> => {
    if (inflight) return inflight
    if (state.loaded && !force) return Promise.resolve()

    state.loading = true
    state.error = null

    inflight = fetchDestinations()
      .then((result) => {
        state.items = result.items
        state.usedMock = result.usedMock
        state.loaded = true
      })
      .catch((error: unknown) => {
        state.error =
          error instanceof DestinationsError ? error.message : '目的地加载失败，请稍后重试'
        // 失败后允许再次点击重试
        state.loaded = false
      })
      .finally(() => {
        state.loading = false
        inflight = null
      })

    return inflight
  }

  return {
    items: computed(() => state.items),
    loading: computed(() => state.loading),
    error: computed(() => state.error),
    usedMock: computed(() => state.usedMock),
    loaded: computed(() => state.loaded),
    load,
    reload: () => load(true),
  }
}