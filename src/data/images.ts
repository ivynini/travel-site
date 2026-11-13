/**
 * 图片资源表
 *
 * 两种格式都通过 import.meta.glob 收集：有 .webp 就优先用，没有则回退到 jpg / png。
 * 这样 `npm run images:webp` 没跑过也能正常构建，跑完自动生效，不需要改代码。
 *
 * 注意这里用的是**精确路径**而不是 `*.{jpg,webp}` 通配符：
 * `src/assets/image/` 里还有大量模板残留素材（图标、按钮等），通配符会把它们
 * 全部打进构建产物。精确列表保证产物只包含真正被引用的图片。
 * 新增图片时，这里和下面的 IMG 都要加一行。
 *
 * 数据源（data/destinations.json）里只存键名（如 "bali1"），
 * 由 resolveImage() 映射成真实地址 —— 这样接口和前端资源可以分开演进。
 */

// Vite 的 glob 返回值类型与具体选项强相关，这里在边界处统一断言成 URL 映射
const modules = import.meta.glob(
  [
    '../assets/image/巴厘岛1.{jpg,jpeg,png,webp}',
    '../assets/image/巴厘岛2.{jpg,jpeg,png,webp}',
    '../assets/image/京都1.{jpg,jpeg,png,webp}',
    '../assets/image/马尔代夫1.{jpg,jpeg,png,webp}',
    '../assets/image/马尔代夫2.{jpg,jpeg,png,webp}',
    '../assets/image/巴黎1.{jpg,jpeg,png,webp}',
    '../assets/image/巴黎2.{jpg,jpeg,png,webp}',
    '../assets/image/阿尔卑斯山1.{jpg,jpeg,png,webp}',
    '../assets/image/樱花1.{jpg,jpeg,png,webp}',
    '../assets/image/希腊1.{jpg,jpeg,png,webp}',
    '../assets/image/肯尼亚1.{jpg,jpeg,png,webp}',
    '../assets/image/新西兰1.{jpg,jpeg,png,webp}',
    '../assets/image/西藏1.{jpg,jpeg,png,webp}',
    '../assets/image/云南1.{jpg,jpeg,png,webp}',
    '../assets/image/banner1.{jpg,jpeg,png,webp}',
    '../assets/image/banner2.{jpg,jpeg,png,webp}',
    '../assets/image/banner3.{jpg,jpeg,png,webp}',
    '../assets/image/banner4.{jpg,jpeg,png,webp}',
  ],
  { eager: true, query: '?url', import: 'default' }
) as unknown as Record<string, string>

/** 优先 webp，其次 jpg，最后 png；都没有时返回空串，避免渲染出 undefined */
function pick(file: string): string {
  const webp = modules[`../assets/image/${file}.webp`]
  if (webp) return webp

  return (
    modules[`../assets/image/${file}.jpg`] ??
    modules[`../assets/image/${file}.jpeg`] ??
    modules[`../assets/image/${file}.png`] ??
    ''
  )
}

const IMG = {
  bali1: pick('巴厘岛1'),
  bali2: pick('巴厘岛2'),
  kyoto1: pick('京都1'),
  maldives1: pick('马尔代夫1'),
  maldives2: pick('马尔代夫2'),
  paris1: pick('巴黎1'),
  paris2: pick('巴黎2'),
  alps1: pick('阿尔卑斯山1'),
  sakura1: pick('樱花1'),
  greece1: pick('希腊1'),
  kenya1: pick('肯尼亚1'),
  nz1: pick('新西兰1'),
  tibet1: pick('西藏1'),
  yunnan1: pick('云南1'),
  banner1: pick('banner1'),
  banner2: pick('banner2'),
  banner3: pick('banner3'),
  banner4: pick('banner4'),
}

export type ImageKey = keyof typeof IMG

export const imageKeys = Object.keys(IMG) as ImageKey[]

/** 键名 → 打包后的 URL */
export function resolveImage(key: string): string {
  return IMG[key as ImageKey] ?? ''
}