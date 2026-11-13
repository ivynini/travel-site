<template>
  <div>
    <div class="section">
      <h2 class="section-title">旅行数据分析</h2>
      <p>根据用户旅行数据生成的统计图表，帮助您了解热门旅行趋势</p>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-box" ref="chart1El"></div>
        </div>
        <div class="chart-card">
          <div class="chart-box" ref="chart2El"></div>
        </div>
        <div class="chart-card chart-card-full">
          <div class="chart-box" ref="wordCloudEl"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, PieChart } from 'echarts/charts'
import { GridComponent, TitleComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
// 词云是运行时扩展，会注册进 echarts 的同一份模块注册表
import 'echarts-wordcloud'

// 按需注册：只引入实际用到的图表类型与组件。
// 整包 `import * as echarts from 'echarts'` 会把所有图表类型、坐标系一起打进 chunk（>1 MB）。
echarts.use([
  BarChart,
  PieChart,
  GridComponent,
  TitleComponent,
  TooltipComponent,
  CanvasRenderer,
])

// 实例类型从 init 推导，不依赖具体类型导出（core 与整包的导出名并不完全一致）
type ChartInstance = ReturnType<typeof echarts.init>
type ChartOption = Parameters<ChartInstance['setOption']>[0]

// 只存 DOM 引用；ECharts 实例放在普通变量里，不进入响应式系统
const chart1El = ref<HTMLDivElement | null>(null)
const chart2El = ref<HTMLDivElement | null>(null)
const wordCloudEl = ref<HTMLDivElement | null>(null)

// 统一登记实例，便于统一 resize / dispose
let instances: ChartInstance[] = []

// 统一创建并登记实例，容器还没挂载时返回 null
const createChart = (el: HTMLDivElement | null): ChartInstance | null => {
  if (!el) return null
  const chart = echarts.init(el)
  instances.push(chart)
  return chart
}

// 只 resize 仍然存活的实例
const handleResize = () => {
  instances.forEach((chart) => chart.resize())
}

const initCharts = () => {
  const textColor = '#6b7280'
  const titleColor = '#1f2937'

  // ECharts 通用主题配置
  const commonTitle = (text: string) => ({
    text,
    left: 'center' as const,
    textStyle: { color: titleColor, fontSize: 15, fontWeight: 600 }
  })

  // 图表1 - 热门目的地饼图
  const pieChart = createChart(chart1El.value)
  pieChart?.setOption({
    title: commonTitle('热门旅行目的地预订量'),
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937' },
      formatter: '{b}: {c} 单 ({d}%)'
    },
    series: [{
      name: '预订量',
      type: 'pie',
      radius: ['48%', '75%'],
      center: ['50%', '55%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 3
      },
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}\n{d}%',
        color: textColor,
        fontSize: 12
      },
      emphasis: {
        label: { fontSize: 16, fontWeight: 'bold' },
        itemStyle: { shadowBlur: 20, shadowColor: 'rgba(0, 0, 0, 0.15)' }
      },
      data: [
        { value: 335, name: '巴厘岛' },
        { value: 310, name: '京都' },
        { value: 234, name: '巴黎' },
        { value: 135, name: '马尔代夫' },
        { value: 154, name: '瑞士' },
        { value: 120, name: '普吉岛' }
      ],
      color: ['#1a73e8', '#ff6b35', '#0daf5e', '#ff9500', '#7c5cfc', '#e8458b']
    }]
  })

  // 图表2 - 各月份旅行预订量
  const barChart = createChart(chart2El.value)
  barChart?.setOption({
    title: commonTitle('各月份旅行预订量'),
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      textStyle: { color: '#1f2937' }
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      axisLabel: { color: textColor, fontSize: 11 },
      axisTick: { show: false },
      axisLine: { lineStyle: { color: '#e5e7eb' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: textColor },
      splitLine: { lineStyle: { color: '#f3f4f6', type: 'dashed' } }
    },
    series: [{
      data: [120, 200, 150, 80, 70, 110, 420, 520, 350, 280, 180, 120],
      type: 'bar',
      barWidth: '55%',
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        // 纯对象写法描述渐变，不必依赖 echarts.graphic（按需引入时少一个导出依赖）
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: '#4a9cf5' },
            { offset: 1, color: '#1a73e8' }
          ]
        }
      },
      emphasis: {
        itemStyle: { color: '#1557b0' }
      }
    }]
  })

  // 图表3 - 词云
  // echarts-wordcloud 是运行时扩展，官方类型里没有 wordCloud 这个 series，这里在边界处断言一次
  const wordCloudChart = createChart(wordCloudEl.value)
  wordCloudChart?.setOption({
    title: commonTitle('旅行关键词词云'),
    tooltip: { show: true },
    series: [{
      type: 'wordCloud',
      gridSize: 8,
      sizeRange: [14, 54],
      rotationRange: [0, 0],
      shape: 'circle',
      width: '100%',
      height: '100%',
      drawOutOfBound: false,
      layoutAnimation: true,
      textStyle: {
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        fontWeight: 600,
        color: (params: { dataIndex: number }) => {
          const colors = ['#1a73e8', '#ff6b35', '#0daf5e', '#7c5cfc', '#ff9500', '#e8458b', '#1557b0', '#f5a623']
          return colors[params.dataIndex % colors.length]
        }
      },
      data: [
        { name: '海滩', value: 80 },
        { name: '雪山', value: 60 },
        { name: '文化', value: 75 },
        { name: '美食', value: 90 },
        { name: '潜水', value: 65 },
        { name: '自驾', value: 70 },
        { name: '温泉', value: 50 },
        { name: '历史', value: 60 },
        { name: '购物', value: 55 },
        { name: '徒步', value: 68 },
        { name: 'City游', value: 90 },
        { name: '郊野', value: 80 },
        { name: '闺蜜', value: 80 },
        { name: '民俗', value: 70 },
        { name: '影视剧', value: 75 },
        { name: '免签', value: 85 },
        { name: '特种兵旅游', value: 70 },
        { name: '数字导游', value: 60 },
        { name: '打卡', value: 90 }
      ]
    }]
  } as unknown as ChartOption)
}

onMounted(() => {
  initCharts()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  // ECharts 实例不会随组件卸载自动回收，必须显式 dispose，否则切页面会持续泄漏
  instances.forEach((chart) => chart.dispose())
  instances = []
})
</script>

<style scoped>
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-top: 16px;
}

.chart-card {
  background: var(--bg);
  border-radius: var(--radius);
  padding: 16px;
  border: 1px solid var(--border);
  transition: box-shadow var(--transition);
}

.chart-card:hover {
  box-shadow: var(--shadow-lg);
}

.chart-card-full {
  grid-column: 1 / -1;
}

.chart-box {
  width: 100%;
  height: 380px;
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }

  .chart-box {
    height: 320px;
  }
}
</style>
