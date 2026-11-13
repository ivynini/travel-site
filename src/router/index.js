import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // 前进后退恢复位置，正常跳转回到顶部（详情页看完长页面后返回列表不会停在半截）
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0 }
  },
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      // 其余路由懒加载：首屏不必下载 ECharts、AI 页等代码
      path: '/AI',
      name: 'AI',
      component: () => import('@/views/AIView.vue'),
    },
    {
      path: '/Visualization',
      name: 'visualization',
      component: () => import('@/views/VisualizationView.vue'),
    },
    {
      path: '/Content',
      name: 'content',
      component: () => import('@/views/ContentView.vue'),
    },
    {
      path: '/destination/:id',
      name: 'destination',
      component: () => import('@/views/DestinationDetailView.vue'),
    },
  ],
})

export default router