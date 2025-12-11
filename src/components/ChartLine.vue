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
    title: { text: props.title || '' },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: props.x },
    yAxis: { type: 'value' },
    tooltip: { trigger: 'axis' },
    series: [{ type: 'line', data: props.y, smooth: true }],
  })
}
</script>

<style scoped>
.chart {
  width: 100%;
  height: 280px;
}
</style>
