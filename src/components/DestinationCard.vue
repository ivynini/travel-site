<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { useFavorites } from '@/composables/useFavorites'
import { formatPrice } from '@/data/destinations'
import type { Destination } from '@/types'

defineProps<{ item: Destination }>()

const { isFavorite, toggle } = useFavorites()
</script>

<template>
  <article class="destination-card">
    <RouterLink :to="{ name: 'destination', params: { id: item.id } }" class="card-link">
      <div class="card-img-wrap">
        <img
          :src="item.cover"
          :alt="item.name"
          class="destination-image"
          width="600"
          height="400"
          loading="lazy"
          decoding="async"
        >
        <span class="card-badge">{{ item.tag }}</span>
        <span v-if="isFavorite(item.id)" class="card-fav-mark" aria-hidden="true">★</span>
      </div>

      <div class="destination-info">
        <div class="destination-location">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {{ item.location }}
        </div>
        <h3 class="destination-name">{{ item.name }}</h3>
        <p class="destination-subtitle">{{ item.subtitle }}</p>
        <p class="destination-desc">{{ item.description }}</p>
      </div>
    </RouterLink>

    <div class="destination-footer">
      <span class="destination-price">
        ¥{{ formatPrice(item.price) }}<small> 起 · {{ item.days }} 天</small>
      </span>
      <button
        type="button"
        class="fav-btn"
        :class="{ 'is-active': isFavorite(item.id) }"
        :aria-pressed="isFavorite(item.id)"
        :aria-label="isFavorite(item.id) ? `取消收藏 ${item.name}` : `收藏 ${item.name}`"
        @click="toggle(item.id)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" :fill="isFavorite(item.id) ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
        {{ isFavorite(item.id) ? '已收藏' : '收藏' }}
      </button>
    </div>
  </article>
</template>

<style scoped>
.destination-card {
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
  border: 1px solid var(--border);
  transition: all var(--transition);
}

.destination-card:hover {
  transform: translateY(-6px);
  box-shadow: var(--shadow-xl);
}

.card-link {
  flex: 1;
  display: block;
  color: inherit;
  text-decoration: none;
}

.card-link:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: -2px;
}

.card-img-wrap {
  position: relative;
  overflow: hidden;
}

.destination-image {
  display: block;
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.destination-card:hover .destination-image {
  transform: scale(1.06);
}

.card-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  background: var(--accent);
  color: #fff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.card-fav-mark {
  position: absolute;
  top: 10px;
  left: 12px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: #e8458b;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-sm);
}

.destination-info {
  padding: 16px 18px 12px;
}

.destination-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--primary);
  font-weight: 500;
  margin-bottom: 6px;
}

.destination-name {
  font-size: 1.12rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 4px;
}

.destination-subtitle {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.destination-desc {
  color: var(--text-secondary);
  font-size: 0.87rem;
  line-height: 1.55;
  margin-bottom: 4px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.destination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 18px 16px;
}

.destination-price {
  font-size: 1.12rem;
  font-weight: 800;
  color: #e53e3e;
}

.destination-price small {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
}

.fav-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: #fff;
  color: var(--text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all var(--transition);
}

.fav-btn:hover {
  border-color: #e8458b;
  color: #e8458b;
}

.fav-btn.is-active {
  border-color: #f9c2d9;
  background: #fff0f6;
  color: #e8458b;
}

.fav-btn:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>