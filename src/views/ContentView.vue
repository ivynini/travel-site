<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DestinationCard from '@/components/DestinationCard.vue'
import { useFavorites } from '@/composables/useFavorites'
import { useDestinations } from '@/composables/useDestinations'
import {
  ALL_CATEGORY,
  SORT_OPTIONS,
  filterDestinations,
  isSortKey,
} from '@/data/filter'
// 分类是稳定的业务枚举，用它校验 URL 参数；具体数据走接口
import { categories } from '@/data/destinations'

const route = useRoute()
const router = useRouter()
const { ids, count } = useFavorites()
const { items, loading, error, usedMock, load, reload } = useDestinations()

onMounted(load)

// 从 URL 初始化：刷新、分享链接、前进后退都能复现同一份筛选结果
const initialSort = route.query.sort
const keyword = ref(String(route.query.q ?? ''))
const activeCategory = ref(
  categories.includes(String(route.query.tag)) ? String(route.query.tag) : ALL_CATEGORY
)
// select 的 v-model 只能给出 string，类型收窄放在使用处（filterDestinations 会校验）
const sortBy = ref<string>(isSortKey(initialSort) ? initialSort : 'default')
const onlyFavorites = ref(route.query.fav === '1')

// 输入框与筛选条件分开：输入做防抖，避免每敲一个字就写一次 URL
const searchInput = ref(keyword.value)
let debounceTimer: ReturnType<typeof setTimeout> | undefined

const commitSearch = (value: string) => {
  clearTimeout(debounceTimer)
  keyword.value = value.trim()
}

watch(searchInput, (value) => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => commitSearch(value), 300)
})

onBeforeUnmount(() => clearTimeout(debounceTimer))

const clearSearch = () => {
  searchInput.value = ''
  commitSearch('')
}

const resetAll = () => {
  searchInput.value = ''
  keyword.value = ''
  activeCategory.value = ALL_CATEGORY
  sortBy.value = 'default'
  onlyFavorites.value = false
}

// 筛选状态 → URL（用 replace，避免每敲一个字都往历史栈里塞一条记录）
watch(
  [keyword, activeCategory, sortBy, onlyFavorites],
  () => {
    const query: Record<string, string> = {}
    if (keyword.value) query.q = keyword.value
    if (activeCategory.value !== ALL_CATEGORY) query.tag = activeCategory.value
    if (sortBy.value !== 'default') query.sort = sortBy.value
    if (onlyFavorites.value) query.fav = '1'
    router.replace({ query })
  },
  { flush: 'post' }
)

// 浏览器前进/后退 → 反写回本地状态
watch(
  () => route.query,
  (query) => {
    const rawSort = query.sort
    const q = String(query.q ?? '')
    const tag = categories.includes(String(query.tag)) ? String(query.tag) : ALL_CATEGORY
    const sort = isSortKey(rawSort) ? rawSort : 'default'
    const fav = query.fav === '1'

    if (q !== keyword.value) {
      keyword.value = q
      searchInput.value = q
    }
    if (tag !== activeCategory.value) activeCategory.value = tag
    if (sort !== sortBy.value) sortBy.value = sort
    if (fav !== onlyFavorites.value) onlyFavorites.value = fav
  }
)

// 筛选与排序逻辑在 src/data/filter.ts 中，纯函数、有单测覆盖
const filteredDestinations = computed(() => {
  const sort = isSortKey(sortBy.value) ? sortBy.value : 'default'

  return filterDestinations(items.value, {
    keyword: keyword.value,
    category: activeCategory.value,
    sort,
    onlyFavorites: onlyFavorites.value,
    favorites: ids.value,
  })
})

const hasActiveFilter = computed(
  () =>
    Boolean(keyword.value) ||
    activeCategory.value !== ALL_CATEGORY ||
    sortBy.value !== 'default' ||
    onlyFavorites.value
)
</script>

<template>
  <div>
    <div class="section">
      <div class="content-header">
        <div>
          <h2 class="section-title">精选旅行目的地</h2>
          <p>按分类、关键词筛选，找到下一趟出发的理由</p>
        </div>
        <span v-if="!loading" class="result-count">共 {{ filteredDestinations.length }} 个目的地</span>
      </div>

      <div class="toolbar">
        <div class="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <line x1="16.5" y1="16.5" x2="21" y2="21" stroke-linecap="round" />
          </svg>
          <input
            v-model="searchInput"
            type="search"
            class="search-input"
            placeholder="搜索目的地、国家或关键词，如「海岛」「京都」"
            aria-label="搜索目的地"
            @keyup.enter="commitSearch(searchInput)"
          >
          <button
            v-if="searchInput"
            type="button"
            class="search-clear"
            aria-label="清空搜索"
            @click="clearSearch"
          >
            ×
          </button>
        </div>

        <select v-model="sortBy" class="sort-select" aria-label="排序方式">
          <option v-for="option in SORT_OPTIONS" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="chips" role="group" aria-label="按分类筛选">
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="chip"
          :class="{ 'is-active': activeCategory === category }"
          :aria-pressed="activeCategory === category"
          @click="activeCategory = category"
        >
          {{ category }}
        </button>
        <button
          type="button"
          class="chip chip-fav"
          :class="{ 'is-active': onlyFavorites }"
          :aria-pressed="onlyFavorites"
          @click="onlyFavorites = !onlyFavorites"
        >
          ♥ 我的收藏（{{ count }}）
        </button>
      </div>

      <p v-if="usedMock" class="state-hint">
        后端未连接，当前展示本地示例数据（运行 npm run server 后自动切换为接口数据）
      </p>

      <div v-if="loading" class="skeleton-grid" aria-busy="true" aria-label="正在加载目的地">
        <div v-for="n in 4" :key="n" class="skeleton-card"></div>
      </div>

      <div v-else-if="error" class="state-block">
        <h3>目的地加载失败</h3>
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" @click="reload">重新加载</button>
      </div>

      <div v-else-if="filteredDestinations.length" class="destination-grid">
        <DestinationCard
          v-for="item in filteredDestinations"
          :key="item.id"
          :item="item"
        />
      </div>

      <div v-else class="empty-result">
        <p class="empty-title">没有匹配的目的地</p>
        <p class="empty-desc">
          {{ onlyFavorites ? '还没有收藏任何目的地，先去逛逛吧。' : '换个关键词或分类试试。' }}
        </p>
        <button v-if="hasActiveFilter" type="button" class="btn-reset" @click="resetAll">
          清空筛选条件
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 18px;
}

.result-count {
  font-size: 0.85rem;
  color: var(--text-muted);
  white-space: nowrap;
  padding-top: 6px;
}

/* ── Toolbar ── */
.toolbar {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  flex: 1;
  min-width: 240px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  height: 42px;
  border: 1.5px solid var(--border);
  border-radius: 22px;
  background: #fff;
  color: var(--text-muted);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.search-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 4px rgba(26, 115, 232, 0.1);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9rem;
  color: var(--text);
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-muted);
}

/* 用自定义的 × 清除按钮，隐藏浏览器自带的那个，避免出现两个 */
.search-input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
}

.search-clear:hover {
  color: var(--text);
}

.sort-select {
  height: 42px;
  padding: 0 14px;
  border: 1.5px solid var(--border);
  border-radius: 22px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 0.88rem;
  cursor: pointer;
  outline: none;
}

.sort-select:focus-visible {
  border-color: var(--primary);
}

/* ── Chips ── */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.chip {
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 0.84rem;
  cursor: pointer;
  transition: all var(--transition);
}

.chip:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.chip.is-active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.chip-fav.is-active {
  background: #e8458b;
  border-color: #e8458b;
}

.chip:focus-visible {
  outline: 2px solid var(--primary-dark);
  outline-offset: 2px;
}

/* ── Grid ── */
.destination-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  margin-top: 22px;
}

@media (max-width: 600px) {
  .destination-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1100px) {
  .destination-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* ── Empty state ── */
.empty-result {
  text-align: center;
  padding: 56px 20px;
}

.empty-title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 18px;
}

.btn-reset {
  padding: 9px 22px;
  border: 1.5px solid var(--primary);
  border-radius: 20px;
  background: #fff;
  color: var(--primary);
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-reset:hover {
  background: var(--primary-light);
}
</style>