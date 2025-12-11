<template>
  <div ref="el" style="width: 100%; height: 100%" />
</template>
<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
const el = ref<HTMLDivElement | null>(null)
const props = defineProps<{ data: { name: string; value: number }[]; title?: string }>()
let chart: echarts.ECharts | null = null
onMounted(() => {
  if (el.value) {
    chart = echarts.init(el.value)
    render()
  }
})
watch(
  () => props.data,
  () => render(),
  { deep: true },
)
onBeforeUnmount(() => chart?.dispose())
function render() {
  if (!chart) return
  chart.setOption({
    title: { text: props.title || '' },
    tooltip: { trigger: 'item' },
    series: [{ type: 'pie', radius: '60%', data: props.data }],
  })
}
</script>
