<template>
  <div>
    <div class="section">
      <h2 class="section-title">旅行数据分析</h2>
      <p>根据用户旅行数据生成的统计图表，帮助您了解热门旅行趋势</p>

      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-box" ref="chart1"></div>
        </div>
        <div class="chart-card">
          <div class="chart-box" ref="chart2"></div>
        </div>
        <div class="chart-card chart-card-full">
          <div class="chart-box" ref="wordCloudChart"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import 'echarts-wordcloud'

export default {
  name: 'VisualizationView',
  created() {
    // 单独放在非响应式属性上：ECharts 实例不需要 Vue 追踪，避免无谓的依赖收集
    this.charts = []
  },
  mounted() {
    this.initCharts()
    window.addEventListener('resize', this.handleResize)
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize)
    // ECharts 实例不会随组件卸载自动回收，必须显式 dispose，否则切页面会持续泄漏
    this.charts.forEach((chart) => chart && chart.dispose())
    this.charts = []
  },
  methods: {
    // 统一创建并登记实例，便于统一 resize / dispose
    createChart(refName) {
      const chart = echarts.init(this.$refs[refName])
      this.charts.push(chart)
      return chart
    },
    handleResize() {
      // 只 resize 仍然存活且已挂载的实例
      this.charts.forEach((chart) => chart && chart.resize())
    },
    initCharts() {
      const textColor = '#6b7280'
      const titleColor = '#1f2937'

      // ECharts 通用主题配置
      const commonTitle = (text) => ({
        text,
        left: 'center',
        textStyle: { color: titleColor, fontSize: 15, fontWeight: 600 }
      })

      // 图表1 - 热门目的地饼图
      this.chart1 = this.createChart('chart1')
      this.chart1.setOption({
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
      this.chart2 = this.createChart('chart2')
      this.chart2.setOption({
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
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#4a9cf5' },
              { offset: 1, color: '#1a73e8' }
            ])
          },
          emphasis: {
            itemStyle: { color: '#1557b0' }
          }
        }]
      })

      // 图表3 - 词云
      this.chart3 = this.createChart('wordCloudChart')
      this.chart3.setOption({
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
            color: (params) => {
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
      })
    }
  }
}
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
