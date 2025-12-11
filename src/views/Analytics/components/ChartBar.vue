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
    title: { text: props.title || '' },
    xAxis: { type: 'category', data: props.x },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: props.y }],
  })
}
</script>
