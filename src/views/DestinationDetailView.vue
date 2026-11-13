<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import DestinationCard from '@/components/DestinationCard.vue'
import { useFavorites } from '@/composables/useFavorites'
import { useDestinations } from '@/composables/useDestinations'
import { findInList, formatPrice, relatedDestinations } from '@/data/destinations'

const DEFAULT_TITLE = '叮叮车旅行 · 用 AI 规划下一次出发'

const route = useRoute()
const router = useRouter()
const { isFavorite, toggle } = useFavorites()
const { items, loading, usedMock, load } = useDestinations()

onMounted(load)

// 由路由参数 + 已加载的列表推导数据，分享/刷新/前进后退都能得到同一结果
const item = computed(() => findInList(items.value, route.params.id))
const related = computed(() => relatedDestinations(item.value, items.value))

const activeIndex = ref(0)
const activeImage = computed<string>(
  () => item.value?.gallery?.[activeIndex.value] ?? item.value?.cover ?? ''
)

// 从「相关推荐」跳到另一个目的地时，重置图集
watch(
  () => item.value?.id,
  () => {
    activeIndex.value = 0
  }
)

watchEffect(() => {
  document.title = item.value ? `${item.value.name} · 叮叮车旅行` : DEFAULT_TITLE
})

onUnmounted(() => {
  document.title = DEFAULT_TITLE
})

const askAI = () => {
  if (!item.value) return
  router.push({
    name: 'AI',
    query: {
      prompt: `帮我规划一次 ${item.value.name} 的 ${item.value.days} 天行程，预算约 ${formatPrice(item.value.price)} 元/人，包含交通和住宿建议`,
    },
  })
}
</script>

<template>
  <div v-if="loading" class="section">
    <div class="skeleton-card" style="height: 360px"></div>
  </div>

  <div v-else-if="!item" class="section empty-state">
    <h2>没有找到这个目的地</h2>
    <p>它可能已下线，或者链接地址不正确。</p>
    <RouterLink to="/Content" class="btn-primary">查看全部目的地</RouterLink>
  </div>

  <div v-else>
    <RouterLink to="/Content" class="back-link">← 返回目的地列表</RouterLink>

    <p v-if="usedMock" class="state-hint">后端未连接，当前展示本地示例数据</p>

    <section class="section detail-hero">
      <div class="gallery">
        <div class="gallery-main">
          <img :src="activeImage" :alt="item.name" width="1200" height="800" decoding="async">
          <span class="gallery-badge">{{ item.tag }}</span>
        </div>
        <div v-if="item.gallery.length > 1" class="gallery-thumbs">
          <button
            v-for="(image, index) in item.gallery"
            :key="image"
            type="button"
            class="thumb"
            :class="{ 'is-active': index === activeIndex }"
            :aria-label="`查看 ${item.name} 第 ${index + 1} 张图片`"
            :aria-current="index === activeIndex"
            @click="activeIndex = index"
          >
            <img :src="image" :alt="`${item.name} 图片 ${index + 1}`" width="160" height="110" loading="lazy">
          </button>
        </div>
      </div>

      <div class="detail-info">
        <p class="detail-location">{{ item.location }} · {{ item.category }}</p>
        <h1 class="detail-title">{{ item.name }}</h1>
        <p class="detail-subtitle">{{ item.subtitle }}</p>
        <p class="detail-desc">{{ item.description }}</p>

        <dl class="detail-meta">
          <div>
            <dt>参考价格</dt>
            <dd class="is-price">¥{{ formatPrice(item.price) }}<small> 起</small></dd>
          </div>
          <div>
            <dt>建议天数</dt>
            <dd>{{ item.days }} 天</dd>
          </div>
          <div>
            <dt>最佳季节</dt>
            <dd>{{ item.bestSeason }}</dd>
          </div>
        </dl>

        <div class="detail-actions">
          <button
            type="button"
            class="btn-fav"
            :class="{ 'is-active': isFavorite(item.id) }"
            :aria-pressed="isFavorite(item.id)"
            @click="toggle(item.id)"
          >
            {{ isFavorite(item.id) ? '★ 已收藏' : '☆ 收藏' }}
          </button>
          <button type="button" class="btn-ai" @click="askAI">
            让 AI 规划这条线路
          </button>
        </div>
      </div>
    </section>

    <section class="section">
      <h2 class="section-title">行程亮点</h2>
      <ul class="detail-list">
        <li v-for="tip in item.highlights" :key="tip">{{ tip }}</li>
      </ul>
    </section>

    <section class="section">
      <h2 class="section-title">出行提示</h2>
      <ul class="detail-list is-tips">
        <li v-for="tip in item.tips" :key="tip">{{ tip }}</li>
      </ul>
    </section>

    <section v-if="related.length" class="section">
      <h2 class="section-title">你可能也喜欢</h2>
      <div class="destination-grid">
        <DestinationCard v-for="entry in related" :key="entry.id" :item="entry" />
      </div>
    </section>
  </div>
</template>

<style scoped>
.back-link {
  display: inline-block;
  margin-bottom: 14px;
  color: var(--text-secondary);
  font-size: 0.88rem;
  text-decoration: none;
  transition: color var(--transition);
}

.back-link:hover {
  color: var(--primary);
}

.detail-hero {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 28px;
  align-items: start;
}

.gallery-main {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--bg);
}

.gallery-main img {
  display: block;
  width: 100%;
  height: 340px;
  object-fit: cover;
}

.gallery-badge {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 5px 14px;
  border-radius: 20px;
  background: var(--accent);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
}

.gallery-thumbs {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.thumb {
  padding: 0;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  overflow: hidden;
  line-height: 0;
  cursor: pointer;
  background: none;
  transition: border-color var(--transition), opacity var(--transition);
  opacity: 0.7;
}

.thumb img {
  display: block;
  width: 92px;
  height: 64px;
  object-fit: cover;
}

.thumb:hover {
  opacity: 1;
}

.thumb.is-active {
  border-color: var(--primary);
  opacity: 1;
}

.thumb:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.detail-location {
  color: var(--primary);
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 6px;
}

.detail-title {
  font-size: 1.85rem;
  font-weight: 800;
  color: var(--text);
  line-height: 1.25;
  margin-bottom: 4px;
}

.detail-subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
  margin-bottom: 14px;
}

.detail-desc {
  color: var(--text-secondary);
  font-size: 0.94rem;
  line-height: 1.7;
  margin-bottom: 18px;
}

.detail-meta {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 14px 0;
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
  margin-bottom: 20px;
}

.detail-meta dt {
  font-size: 0.76rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}

.detail-meta dd {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text);
}

.detail-meta .is-price {
  color: #e53e3e;
  font-size: 1.15rem;
  font-weight: 800;
}

.detail-meta .is-price small {
  font-size: 0.74rem;
  font-weight: 400;
  color: var(--text-muted);
}

.detail-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.btn-fav,
.btn-ai {
  padding: 11px 22px;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid var(--primary);
  transition: all var(--transition);
}

.btn-fav {
  background: #fff;
  color: var(--primary);
}

.btn-fav:hover,
.btn-fav.is-active {
  background: var(--primary-light);
}

.btn-ai {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.btn-ai:hover {
  background: var(--primary-dark);
  border-color: var(--primary-dark);
  box-shadow: 0 6px 16px rgba(26, 115, 232, 0.28);
}

.btn-fav:focus-visible,
.btn-ai:focus-visible {
  outline: 2px solid var(--primary-dark);
  outline-offset: 2px;
}

.detail-list {
  list-style: none;
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.detail-list li {
  position: relative;
  padding-left: 24px;
  color: var(--text-secondary);
  font-size: 0.92rem;
  line-height: 1.6;
}

.detail-list li::before {
  content: '✓';
  position: absolute;
  left: 0;
  top: 0;
  color: var(--success);
  font-weight: 700;
}

.detail-list.is-tips li::before {
  content: '!';
  color: var(--warning);
}

.destination-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
}

.empty-state h2 {
  font-size: 1.3rem;
  color: var(--text);
  margin-bottom: 8px;
}

.empty-state p {
  color: var(--text-secondary);
  font-size: 0.92rem;
  margin-bottom: 20px;
}

@media (max-width: 860px) {
  .detail-hero {
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .gallery-main img {
    height: 240px;
  }

  .detail-title {
    font-size: 1.5rem;
  }

  .detail-meta {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>