/**
 * AbortError 判断
 *
 * 浏览器里 abort 抛的是 DOMException，不是 Error 子类，
 * 所以只能按 name 判断；放在单独模块里，避免各调用方各写一份。
 */
export const isAbortError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { name?: string }).name === 'AbortError'