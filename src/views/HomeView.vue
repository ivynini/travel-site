<template>
  <div>
    <!-- Hero Banner -->
    <div class="section hero-section">
      <div class="hero-content">
        <h2 class="hero-title">探索世界的精彩</h2>
        <p class="hero-desc">叮叮车旅游网为您提供全球精选旅游目的地，个性化行程规划，以及专业的旅行建议。无论您是想放松身心还是寻求冒险，我们都能满足您的需求。</p>
      </div>

      <!-- 轮播图 -->
      <div class="carousel-container">
        <div class="carousel-wrapper">
          <van-swipe ref="swipeRef" :autoplay="3000" indicator-color="#1a73e8" class="carousel">
            <van-swipe-item v-for="(image, index) in carouselImages" :key="index">
              <div class="carousel-slide">
                <img :src="image.src" class="carousel-image" :alt="image.title">
                <div class="carousel-overlay">
                  <span class="carousel-tag">{{ image.tag }}</span>
                  <h3 class="carousel-title">{{ image.title }}</h3>
                  <p class="carousel-desc">{{ image.desc }}</p>
                </div>
              </div>
            </van-swipe-item>
          </van-swipe>

          <button class="carousel-btn prev-btn" @click="swipeRef?.prev()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="carousel-btn next-btn" @click="swipeRef?.next()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 特色卡片 -->
    <div class="section">
      <h2 class="section-title">我们的特色</h2>
      <p>四大核心优势，为您打造完美旅行体验</p>
      <div class="features">
        <div class="feature-card" v-for="(feat, i) in features" :key="i">
          <div class="feature-icon-wrap">
            <span class="feature-icon">{{ feat.icon }}</span>
          </div>
          <h3>{{ feat.title }}</h3>
          <p>{{ feat.desc }}</p>
        </div>
      </div>
    </div>

    <!-- 热门目的地 -->
    <div class="section">
      <h2 class="section-title">热门目的地</h2>
      <p>精选全球热门旅游城市，开启您的梦想之旅</p>

      <p v-if="usedMock" class="state-hint">后端未连接，当前展示本地示例数据</p>

      <div v-if="loading" class="skeleton-grid" aria-busy="true" aria-label="正在加载热门目的地">
        <div v-for="n in 3" :key="n" class="skeleton-card"></div>
      </div>

      <div v-else-if="error" class="state-block">
        <h3>热门目的地加载失败</h3>
        <p>{{ error }}</p>
        <button type="button" class="btn-primary" @click="reload">重新加载</button>
      </div>

      <div v-else class="destination-grid">
        <DestinationCard v-for="item in hotDestinations" :key="item.id" :item="item" />
      </div>
      <div class="section-more">
        <RouterLink to="/Content" class="more-link">查看全部目的地 →</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import DestinationCard from '@/components/DestinationCard.vue'
import { useDestinations } from '@/composables/useDestinations'
import { resolveImage } from '@/data/images'

// 只声明用得到的两个方法，避免为了一个 ref 去依赖 Vant 的实例类型
interface SwipeApi {
  prev: () => void
  next: () => void
}

interface CarouselItem {
  src: string
  tag: string
  title: string
  desc: string
}

interface FeatureItem {
  icon: string
  title: string
  desc: string
}

const swipeRef = ref<SwipeApi | null>(null)

// 热门目的地来自接口（开发环境后端未启动时自动降级为本地数据）
const { items, loading, error, usedMock, load, reload } = useDestinations()
const hotDestinations = computed(() => items.value.filter((item) => item.hot))

onMounted(load)

const carouselImages: CarouselItem[] = [
  {
    src: resolveImage('banner1'),
    tag: '海岛度假', title: '马尔代夫', desc: '入住水上别墅，畅游碧蓝大海'
  },
  {
    src: resolveImage('banner2'),
    tag: '文化之旅', title: '日本京都', desc: '千年古都，感受传统与现代的交融'
  },
  {
    src: resolveImage('banner3'),
    tag: '浪漫之都', title: '法国巴黎', desc: '漫步塞纳河畔，品味法式优雅生活'
  },
  {
    src: resolveImage('banner4'),
    tag: '秘境探索', title: '川藏线', desc: '穿越横断山脉，感受高原壮美风景'
  }
]

const features: FeatureItem[] = [
  { icon: '✈️', title: '全球覆盖', desc: '覆盖全球 100+ 国家精选目的地，深度游体验' },
  { icon: '🧳', title: '行程定制', desc: '根据您的喜好和时间，量身定制专属旅行计划' },
  { icon: '🏨', title: '精品住宿', desc: '精选高评分酒店与特色民宿，舒适每一晚' },
  { icon: '💰', title: '最优价格', desc: '全网比价，保证您获得最具性价比的旅游产品' }
]
</script>

<style scoped>
/* ── Hero Section ── */
.hero-section {
  padding: 0;
  overflow: hidden;
}

.hero-content {
  padding: 24px 28px 16px;
}

.hero-title {
  font-size: 2rem;
  font-weight: 800;
  background: linear-gradient(135deg, #1a73e8, #1557b0);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 6px;
}

.hero-desc {
  color: var(--text-secondary);
  font-size: 0.95rem;
  max-width: 700px;
}

/* ── Carousel ── */
.carousel-container {
  margin: 0;
}

.carousel-wrapper {
  position: relative;
  width: 100%;
}

.carousel-slide {
  position: relative;
  height: 320px;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 40px 28px 24px;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  color: #fff;
}

.carousel-tag {
  display: inline-block;
  background: var(--accent);
  color: #fff;
  padding: 3px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.carousel-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.carousel-desc {
  font-size: 0.9rem;
  opacity: 0.9;
}

.carousel-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255,255,255,0.92);
  color: #333;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: all var(--transition);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.carousel-btn:hover {
  background: #fff;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
  transform: translateY(-50%) scale(1.05);
}

.prev-btn { left: 16px; }
.next-btn { right: 16px; }

/* ── Features ── */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin-top: 16px;
}

.feature-card {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 28px 22px;
  text-align: center;
  transition: all var(--transition);
  border: 1px solid transparent;
}

.feature-card:hover {
  background: #fff;
  border-color: var(--primary);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.feature-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary-light), #d4e4fc);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.feature-icon {
  font-size: 1.8rem;
}

.feature-card h3 {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.feature-card p {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

/* ── Destination Grid ── */
.destination-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.section-more {
  margin-top: 22px;
  text-align: center;
}

.more-link {
  display: inline-block;
  padding: 9px 22px;
  border: 1.5px solid var(--primary);
  border-radius: 22px;
  color: var(--primary);
  font-size: 0.86rem;
  font-weight: 600;
  text-decoration: none;
  transition: all var(--transition);
}

.more-link:hover {
  background: var(--primary);
  color: #fff;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .hero-title {
    font-size: 1.5rem;
  }

  .carousel-slide {
    height: 220px;
  }

  .carousel-overlay {
    padding: 24px 16px 16px;
  }

  .carousel-title {
    font-size: 1.15rem;
  }

  .features {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  .feature-card {
    padding: 18px 12px;
  }

  .feature-icon-wrap {
    width: 48px;
    height: 48px;
    border-radius: 12px;
  }

  .feature-icon {
    font-size: 1.4rem;
  }

  .destination-grid {
    grid-template-columns: 1fr;
  }
}
</style>
