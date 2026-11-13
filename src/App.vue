<script setup lang="ts">
import { ref } from 'vue'

// RouterLink / RouterView / van-* 都是全局注册的，这里不需要 import。
// van-tabbar 用 route 模式按当前路由高亮，active 只用于满足 v-model 的类型要求。
const active = ref<number | string>(0)
</script>

<template>
  <header>
    <div class="header-inner">
      <div class="logo">
        <img class="logo-image" src="../src/assets/image/logo.jpg" alt="叮叮车">
        <div class="logo-text">
          <h1>叮叮车</h1>
          <span class="logo-subtitle">旅游网</span>
        </div>
      </div>
      <nav class="desktop-nav">
        <RouterLink to="/" class="nav-link">首页</RouterLink>
        <RouterLink to="/AI" class="nav-link">AI助手</RouterLink>
        <RouterLink to="/Visualization" class="nav-link">数据分析</RouterLink>
        <RouterLink to="/Content" class="nav-link">景点一览</RouterLink>
      </nav>
    </div>
  </header>

  <div class="page-wrapper">
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>

  <footer class="site-footer">
    <div class="footer-inner">
      <div class="footer-brand">
        <h3>叮叮车旅游网</h3>
        <p>探索世界，发现美好</p>
      </div>
      <div class="footer-links">
        <a href="#">关于我们</a>
        <a href="#">联系方式</a>
        <a href="#">隐私政策</a>
        <a href="#">服务条款</a>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; 2024 畅游天下旅游平台 — 用心服务每一位旅行者</p>
    </div>
  </footer>

  <van-tabbar v-model="active" route :fixed="true" :border="true" :safe-area-inset-bottom="true">
    <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
    <van-tabbar-item icon="chat-o" to="/AI">AI助手</van-tabbar-item>
    <van-tabbar-item icon="chart-trending-o" to="/Visualization">数据</van-tabbar-item>
    <van-tabbar-item icon="photo-o" to="/Content">目的地</van-tabbar-item>
  </van-tabbar>
</template>

<style scoped>
/* 说明：全局的 CSS 变量、body 样式与 reset 都在 src/assets/base.css 中。
   放在 scoped 里的 :root / body 选择器会被编译成 :root[data-v-xxx]，永远匹配不到，属于死代码。 */

/* ── Header ── */
header {
  background: linear-gradient(135deg, #1a73e8 0%, #1557b0 40%, #0d3b7a 100%);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 20px rgba(26, 115, 232, 0.25);
}

.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-image {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(255,255,255,0.4);
  box-shadow: 0 2px 12px rgba(0,0,0,0.2);
}

.logo-text h1 {
  font-size: 1.35rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  line-height: 1.2;
}

.logo-subtitle {
  font-size: 0.78rem;
  color: rgba(255,255,255,0.75);
  letter-spacing: 2px;
  text-transform: uppercase;
}

/* ── Desktop Nav ── */
.desktop-nav {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.12);
  border-radius: 30px;
  padding: 4px;
  backdrop-filter: blur(10px);
}

.nav-link {
  padding: 8px 20px;
  border-radius: 26px;
  color: rgba(255,255,255,0.85);
  text-decoration: none;
  font-size: 0.93rem;
  font-weight: 500;
  transition: all var(--transition);
}

.nav-link:hover,
.nav-link.router-link-exact-active {
  background: #fff;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* ── Page wrapper ── */
.page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px 16px;
  min-height: calc(100vh - 200px);
}

/* ── Page transition ── */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ── Footer ── */
.site-footer {
  background: linear-gradient(135deg, #1a1e2b 0%, #151821 100%);
  color: #e5e7eb;
  margin-top: 48px;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 24px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 32px;
}

.footer-brand h3 {
  font-size: 1.2rem;
  color: #fff;
  margin-bottom: 6px;
}

.footer-brand p {
  color: #9ca3af;
  font-size: 0.9rem;
}

.footer-links {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.footer-links a {
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.9rem;
  transition: color var(--transition);
}

.footer-links a:hover {
  color: #fff;
}

.footer-bottom {
  border-top: 1px solid rgba(255,255,255,0.08);
  text-align: center;
  padding: 16px 24px;
  font-size: 0.82rem;
  color: #6b7280;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .header-inner {
    padding: 10px 16px;
  }

  .desktop-nav {
    display: none;
  }

  .logo-image {
    width: 40px;
    height: 40px;
  }

  .logo-text h1 {
    font-size: 1.15rem;
  }

  .page-wrapper {
    padding: 16px 10px;
  }

  .footer-inner {
    flex-direction: column;
    text-align: center;
    align-items: center;
  }

  .footer-links {
    justify-content: center;
  }
}
</style>
