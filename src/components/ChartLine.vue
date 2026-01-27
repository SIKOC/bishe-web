<template>
  <div ref="el" class="chart" />
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'

const el = ref<HTMLDivElement | null>(null)
const props = defineProps<{ x: string[]; y: number[]; title?: string }>()
let chart: echarts.ECharts | null = null

onMounted(() => {
  if (!el.value) return
  chart = echarts.init(el.value)
  render()
})

watch(
  () => [props.x, props.y],
  () => render(),
)

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})

function render() {
  if (!chart) return
  chart.setOption({
    title: { text: props.title || '', textStyle: { color: '#e6f0ff' } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: props.x,
      axisLine: { lineStyle: { color: 'rgba(86, 211, 255, 0.35)' } },
      axisLabel: { color: '#9bb3d3' },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: 'rgba(86, 211, 255, 0.35)' } },
      splitLine: { lineStyle: { color: 'rgba(86, 211, 255, 0.12)' } },
      axisLabel: { color: '#9bb3d3' },
    },
    tooltip: { trigger: 'axis' },
    series: [
      {
        type: 'line',
        data: props.y,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: '#56d3ff', width: 2 },
        itemStyle: { color: '#56d3ff' },
        areaStyle: { color: 'rgba(86, 211, 255, 0.2)' },
      }
    ],
  })
}
</script>

<style scoped>
.chart {
  width: 100%;
  height: 280px;
}
</style>
