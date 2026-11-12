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

          <button class="carousel-btn prev-btn" @click="$refs.swipeRef.prev()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="carousel-btn next-btn" @click="$refs.swipeRef.next()">
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
      <div class="destination-grid">
        <div class="destination-card" v-for="(item, index) in hotDestinations" :key="index">
          <div class="card-img-wrap">
            <img :src="item.image" class="destination-image" :alt="item.name">
            <div class="card-badge">{{ item.tag }}</div>
          </div>
          <div class="destination-info">
            <div class="destination-name">{{ item.name }}</div>
            <div class="destination-desc">{{ item.desc }}</div>
            <div class="destination-footer">
              <span class="destination-price">¥{{ item.price }}<small> 起</small></span>
              <button class="btn-sm">去看看</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'HomeView',
  data() {
    return {
      carouselImages: [
        {
          src: new URL('../assets/image/banner1.jpg', import.meta.url).href,
          tag: '海岛度假', title: '马尔代夫', desc: '入住水上别墅，畅游碧蓝大海'
        },
        {
          src: new URL('../assets/image/banner2.jpg', import.meta.url).href,
          tag: '文化之旅', title: '日本京都', desc: '千年古都，感受传统与现代的交融'
        },
        {
          src: new URL('../assets/image/banner3.jpg', import.meta.url).href,
          tag: '浪漫之都', title: '法国巴黎', desc: '漫步塞纳河畔，品味法式优雅生活'
        },
        {
          src: new URL('../assets/image/banner4.jpg', import.meta.url).href,
          tag: '秘境探索', title: '川藏线', desc: '穿越横断山脉，感受高原壮美风景'
        }
      ],
      features: [
        { icon: '✈️', title: '全球覆盖', desc: '覆盖全球 100+ 国家精选目的地，深度游体验' },
        { icon: '🧳', title: '行程定制', desc: '根据您的喜好和时间，量身定制专属旅行计划' },
        { icon: '🏨', title: '精品住宿', desc: '精选高评分酒店与特色民宿，舒适每一晚' },
        { icon: '💰', title: '最优价格', desc: '全网比价，保证您获得最具性价比的旅游产品' }
      ],
      hotDestinations: [
        {
          name: '巴厘岛浪漫之旅',
          desc: '享受阳光沙滩，体验独特的巴厘岛文化，入住豪华海景别墅',
          price: '4,580',
          tag: '热门',
          image: new URL('../assets/image/巴厘岛1.jpg', import.meta.url).href
        },
        {
          name: '日本京都文化行',
          desc: '探索千年古都，感受传统与现代融合，品尝地道日式料理',
          price: '5,980',
          tag: '新品',
          image: new URL('../assets/image/京都1.jpg', import.meta.url).href
        },
        {
          name: '马尔代夫度假天堂',
          desc: '入住水上别墅，享受私人海滩，体验世界顶级潜水胜地',
          price: '12,800',
          tag: '热门',
          image: new URL('../assets/image/马尔代夫1.jpg', import.meta.url).href
        },
        {
          name: '巴黎艺术之旅',
          desc: '漫步塞纳河畔，参观卢浮宫，感受浪漫之都的艺术气息',
          price: '8,990',
          tag: '推荐',
          image: new URL('../assets/image/巴黎1.jpg', import.meta.url).href
        },
        {
          name: '川藏秘境探索',
          desc: '穿越横断山和青藏高原，感受藏民族的独特文化魅力',
          price: '8,000',
          tag: '探险',
          image: new URL('../assets/image/西藏1.jpg', import.meta.url).href
        },
        {
          name: '云南古城奇遇',
          desc: '骑行洱海畔感受风花雪月，漫步大理古城邂逅浪漫与自由',
          price: '3,000',
          tag: '推荐',
          image: new URL('../assets/image/云南1.jpg', import.meta.url).href
        }
      ]
    };
  }
};
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

.destination-info {
  padding: 16px 18px;
}

.destination-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}

.destination-desc {
  color: var(--text-secondary);
  font-size: 0.88rem;
  line-height: 1.5;
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
  font-size: 1.2rem;
  font-weight: 800;
  color: #e53e3e;
}

.destination-price small {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--text-muted);
}

.btn-sm {
  padding: 7px 18px;
  border: none;
  border-radius: 20px;
  background: var(--primary);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.btn-sm:hover {
  background: var(--primary-dark);
  box-shadow: 0 4px 12px rgba(26, 115, 232, 0.3);
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
