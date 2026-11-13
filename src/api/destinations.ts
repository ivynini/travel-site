/**
 * 目的地接口
 *
 * - 开发环境走 Vite 代理（/api → http://localhost:3000），线上用 VITE_API_BASE_URL
 * - 接口返回的是 DTO（图片是键名），在这里统一映射成视图模型
 * - 开发环境后端没起时降级到本地数据，只跑前端也能看到完整页面；生产环境不做降级，交给错误态处理
 */
import { isAbortError } from './abort'
import { destinations as localDestinations, toDestination } from '@/data/destinations'
import type { Destination, DestinationDTO } from '@/types'

const API_BASE = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').replace(/\/+$/, '')

// 开发期降级时加一点延迟，让加载态是真实可见的，而不是闪一下
const MOCK_DELAY_MS = 600
const USE_LOCAL_FALLBACK = import.meta.env.DEV

export class DestinationsError extends Error {
  status: number

  constructor(message: string, status = 0) {
    super(message)
    this.name = 'DestinationsError'
    this.status = status
  }
}

export interface DestinationPayload {
  items: DestinationDTO[]
  total: number
}

export interface DestinationResult {
  items: Destination[]
  /** true 表示接口不可用，当前用的是本地兜底数据 */
  usedMock: boolean
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function fetchDestinations(signal?: AbortSignal): Promise<DestinationResult> {
  try {
    const response = await fetch(`${API_BASE}/api/destinations`, {
      signal,
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      throw new DestinationsError(`目的地接口返回 ${response.status}`, response.status)
    }

    const data = (await response.json()) as DestinationPayload
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new DestinationsError('目的地接口返回了空数据', 502)
    }

    return { items: data.items.map(toDestination), usedMock: false }
  } catch (error) {
    if (isAbortError(error)) throw error

    if (!USE_LOCAL_FALLBACK) {
      throw error instanceof DestinationsError
        ? error
        : new DestinationsError('连不上目的地接口，请稍后重试', 0)
    }

    await delay(MOCK_DELAY_MS)
    return { items: localDestinations, usedMock: true }
  }
}