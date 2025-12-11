<template>
  <el-card>
    <template #header>能效分析</template>
    <div ref="el" style="height: 420px" />
  </el-card>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, onBeforeUnmount } from 'vue'
const el = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
onMounted(() => {
  if (el.value) {
    chart = echarts.init(el.value)
    chart.setOption({
      xAxis: { type: 'value', name: '距离(km)' },
      yAxis: { type: 'value', name: '耗电(%)' },
      tooltip: {},
      series: [
        {
          type: 'scatter',
          data: Array.from({ length: 40 }, () => [Math.random() * 30, Math.random() * 80]),
        },
      ],
    })
  }
})
onBeforeUnmount(() => chart?.dispose())
</script>
