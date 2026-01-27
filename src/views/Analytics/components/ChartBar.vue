<template>
  <div ref="el" style="width: 100%; height: 100%" />
</template>
<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
const el = ref<HTMLDivElement | null>(null)
const props = defineProps<{ x: string[]; y: number[]; title?: string }>()
let chart: echarts.ECharts | null = null
onMounted(() => {
  if (el.value) {
    chart = echarts.init(el.value)
    render()
  }
})
watch(
  () => [props.x, props.y],
  () => render(),
)
onBeforeUnmount(() => chart?.dispose())
function render() {
  if (!chart) return
  chart.setOption({
    title: { text: props.title || '', textStyle: { color: '#e6f0ff' } },
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
    series: [
      {
        type: 'bar',
        data: props.y,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#56d3ff' },
            { offset: 1, color: '#2b5cff' },
          ]),
        },
      }
    ],
  })
}
</script>
