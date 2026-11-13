import './assets/main.css'
import 'vant/lib/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// 按需注册实际用到的 Vant 组件，避免全量引入导致产物变大
// 新增组件时记得在这里补充注册
import { Swipe, SwipeItem, Tabbar, TabbarItem } from 'vant'

const app = createApp(App)

app.use(router)
app.use(Swipe)
app.use(SwipeItem)
app.use(Tabbar)
app.use(TabbarItem)

app.mount('#app')