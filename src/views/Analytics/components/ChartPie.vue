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
    title: { text: props.title || '', textStyle: { color: '#e6f0ff' } },
    tooltip: { trigger: 'item' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '65%'],
        label: { color: '#9bb3d3' },
        data: props.data,
        itemStyle: {
          borderColor: 'rgba(8, 17, 34, 0.8)',
          borderWidth: 2,
        }
      }
    ],
  })
}
</script>
