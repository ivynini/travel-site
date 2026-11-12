import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import AIView from '@/views/AIView.vue'
import VisualizationView from '@/views/VisualizationView.vue'
import ContentView from '@/views/ContentView.vue'
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/AI',
      name: 'AI',
      component: AIView,
    },
    {
      path: '/Visualization',
      name: 'visualization',
      component: VisualizationView,
    },
    {
      path: '/Content',
      name: 'content',
      component: ContentView,
    },
  ],
})

export default router
