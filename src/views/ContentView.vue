<template>
  <div>
    <div class="section">
      <div class="content-header">
        <div>
          <h2 class="section-title">精选旅行目的地</h2>
          <p>探索我们精心挑选的全球旅行目的地，寻找您的下一个冒险之旅</p>
        </div>
      </div>

      <div class="destination-grid">
        <div class="destination-card" v-for="(item, index) in destinations" :key="index">
          <div class="card-img-wrap">
            <img :src="item.image" class="destination-image" :alt="item.name">
            <div class="card-badge">{{ item.tag }}</div>
          </div>
          <div class="destination-info">
            <div class="destination-location">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
              {{ item.location }}
            </div>
            <div class="destination-name">{{ item.name }}</div>
            <div class="destination-desc">{{ item.description }}</div>
            <div class="destination-footer">
              <span class="destination-price">¥{{ item.price }}<small> 起</small></span>
              <van-button type="primary" size="small" round>查看详情</van-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ContentView',
  data() {
    return {
      destinations: [
        {
          name: '马尔代夫水上别墅',
          location: '马尔代夫',
          description: '入住奢华水上别墅，享受私人海滩和清澈海水，体验世界顶级潜水。',
          price: '12,800',
          tag: '奢华',
          image: new URL('../assets/image/马尔代夫1.jpg', import.meta.url).href
        },
        {
          name: '瑞士阿尔卑斯山',
          location: '瑞士',
          description: '探索壮丽的阿尔卑斯山脉，体验滑雪、徒步和世界级自然风光。',
          price: '15,800',
          tag: '热门',
          image: new URL('../assets/image/阿尔卑斯山1.jpg', import.meta.url).href
        },
        {
          name: '日本樱花季',
          location: '日本',
          description: '春季限定樱花之旅，漫步京都古寺，体验传统茶道和温泉文化。',
          price: '11,500',
          tag: '季节限定',
          image: new URL('../assets/image/樱花1.jpg', import.meta.url).href
        },
        {
          name: '希腊圣托里尼',
          location: '希腊',
          description: '蓝白相间的梦幻岛屿，欣赏爱琴海日落，品尝地道地中海美食。',
          price: '9,800',
          tag: '浪漫',
          image: new URL('../assets/image/希腊1.jpg', import.meta.url).href
        },
        {
          name: '肯尼亚野生动物',
          location: '肯尼亚',
          description: '在马赛马拉国家保护区体验惊险刺激的野生动物观赏之旅。',
          price: '13,500',
          tag: '探险',
          image: new URL('../assets/image/肯尼亚1.jpg', import.meta.url).href
        },
        {
          name: '新西兰南岛自驾',
          location: '新西兰',
          description: '沿着世界最美公路自驾，探索冰川、湖泊和奇幻的中土世界。',
          price: '16,800',
          tag: '自驾',
          image: new URL('../assets/image/新西兰1.jpg', import.meta.url).href
        }
      ]
    }
  }
}
</script>

<style scoped>
.content-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 4px;
}

/* ── Destination Grid ── */
.destination-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px;
  margin-top: 20px;
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

/* ── Card ── */
.destination-card {
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

.card-img-wrap {
  position: relative;
  overflow: hidden;
}

.destination-image {
  width: 100%;
  height: 210px;
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

/* ── Card Info ── */
.destination-info {
  padding: 16px 18px;
}

.destination-location {
  font-size: 0.82rem;
  color: var(--primary);
  font-weight: 500;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.destination-name {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.destination-desc {
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.55;
  margin-bottom: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.destination-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.destination-price {
  font-size: 1.15rem;
  font-weight: 800;
  color: #e53e3e;
}

.destination-price small {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-muted);
}
</style>
