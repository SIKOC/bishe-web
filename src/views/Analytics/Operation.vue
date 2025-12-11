<template>
  <el-card>
    <template #header>运营分析</template>
    <div style="height: 320px">
      <ChartBar :x="x" :y="y" title="各医院发单量排名" />
    </div>
    <div style="height: 320px; margin-top: 12px">
      <ChartPie :data="pie" title="物资类型占比" />
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import ChartBar from './components/ChartBar.vue'
import ChartPie from './components/ChartPie.vue'

const x = ref<string[]>([])
const y = ref<number[]>([])
const pie = ref<{ name: string; value: number }[]>([])
onMounted(() => {
  x.value = ['中心医院', '市立医院', '第一医院', '人民医院']
  y.value = [120, 98, 86, 70]
  pie.value = [
    { name: '药品', value: 45 },
    { name: '血液', value: 25 },
    { name: '试剂', value: 20 },
    { name: '器材', value: 10 },
  ]
})
</script>
