/**
 * 批量把 src/assets/image 下的 jpg / png 转成同名的 .webp
 *
 * 用法：
 *   npm run images:webp                      # 只转换，保留源图
 *   npm run images:webp -- --prune           # 转换并删除已有更小 webp 的源图（产物只留一份）
 *   npm run images:webp -- --force --prune   # 忽略"已是最新"，全部重转（改了 QUALITY / MAX_WIDTH 后用）
 *
 * 设计要点：
 * - 幂等：目标 webp 比源图新就跳过，重复执行不会反复压缩
 * - 按收益决策：转完反而更大的图保留原图，不做"为了优化而变大"的优化
 * - 超宽图先缩到 MAX_WIDTH：图片实际展示宽度远小于原图，不缩就是白下载
 * - 默认不删源图：`--prune` 才删，且跳过白名单（如 App.vue 直接引用的 logo）
 */
import { readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const IMAGE_DIR = fileURLToPath(new URL('../src/assets/image', import.meta.url))
const QUALITY = 78
const MAX_WIDTH = 1600
const RASTER_RE = /\.(jpe?g|png)$/i

// 这些图被代码按原文件名直接引用，不能因为有了 webp 就删掉
const KEEP_SOURCES = new Set(['logo'])
const PRUNE = process.argv.includes('--prune')
const FORCE = process.argv.includes('--force')

const toKB = (bytes) => `${(bytes / 1024).toFixed(0)}KB`

const files = (await readdir(IMAGE_DIR)).filter((name) => RASTER_RE.test(name))

if (!files.length) {
  console.log(`没有找到可转换的图片：${IMAGE_DIR}`)
  process.exit(0)
}

let beforeBytes = 0
let afterBytes = 0
let converted = 0
let skipped = 0
let pruned = 0

for (const fileName of files) {
  const baseName = path.parse(fileName).name
  const sourcePath = path.join(IMAGE_DIR, fileName)
  const targetPath = path.join(IMAGE_DIR, `${baseName}.webp`)

  const [sourceStat, targetStat] = await Promise.all([
    stat(sourcePath),
    stat(targetPath).catch(() => null),
  ])

  // 已转换过且源图没更新：只有确实更小才保留，否则删掉回退到原图
  if (!FORCE && targetStat && targetStat.mtimeMs >= sourceStat.mtimeMs) {
    skipped += 1

    if (targetStat.size < sourceStat.size) {
      if (PRUNE && !KEEP_SOURCES.has(baseName)) {
        await unlink(sourcePath)
        pruned += 1
        console.log(`${fileName}  已是最新（${toKB(targetStat.size)}），删除源图`)
      }
      continue
    }

    await unlink(targetPath)
    console.log(
      `${fileName}  跳过：已有 webp 反而更大（${toKB(targetStat.size)} > ${toKB(sourceStat.size)}），已删除`
    )
    continue
  }

  const buffer = await sharp(sourcePath)
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: QUALITY })
    .toBuffer()

  // 收益为负时不留 webp，避免"优化"把资源变大
  if (buffer.length >= sourceStat.size) {
    if (targetStat) await unlink(targetPath)
    skipped += 1
    console.log(`${fileName}  跳过：转 webp 无收益（${toKB(sourceStat.size)} → ${toKB(buffer.length)}）`)
    continue
  }

  await writeFile(targetPath, buffer)

  beforeBytes += sourceStat.size
  afterBytes += buffer.length
  converted += 1

  const saved = (1 - buffer.length / sourceStat.size) * 100
  console.log(`${fileName}  ${toKB(sourceStat.size)} → ${toKB(buffer.length)}  -${saved.toFixed(0)}%`)

  if (PRUNE && !KEEP_SOURCES.has(baseName)) {
    await unlink(sourcePath)
    pruned += 1
  }
}

console.log(`\n完成：转换 ${converted} 张，跳过 ${skipped} 张，删除源图 ${pruned} 张`)

if (converted) {
  const saved = (1 - afterBytes / beforeBytes) * 100
  console.log(`合计 ${toKB(beforeBytes)} → ${toKB(afterBytes)}，减少 ${saved.toFixed(0)}%`)
}