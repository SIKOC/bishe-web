<script setup lang="ts">
import { onMounted, ref } from 'vue'
import StatsCard from '../components/StatsCard.vue'
import MapContainer from '../components/MapContainer.vue'
import { getStats, get24HourTasks, getTodoList } from '../api/dashboard'
import * as echarts from 'echarts'

const stats = ref({ todayTasks: 0, onlineDrones: 0, totalMileage: 0, alerts: 0 })
const chartRef = ref<HTMLDivElement | null>(null)
const loading = ref(true)
const todos = ref<Array<{ id: string; text: string; done: boolean }>>([])

onMounted(async () => {
  loading.value = true
  stats.value = await getStats()
  const res = await get24HourTasks()
  const t = await getTodoList()
  todos.value = t

  if (chartRef.value) {
    const myChart = echarts.init(chartRef.value)
    myChart.setOption({
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: res.hours },
      yAxis: { type: 'value' },
      series: [{ data: res.data, type: 'line', smooth: true, areaStyle: {} }],
    })
  }
  loading.value = false
})
</script>

<template>
  <div>
    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="6"><StatsCard title="今日任务数" :value="stats.todayTasks" /></el-col>
      <el-col :span="6"><StatsCard title="在线无人机" :value="stats.onlineDrones" /></el-col>
      <el-col :span="6"><StatsCard title="总里程" :value="stats.totalMileage" /></el-col>
      <el-col :span="6"><StatsCard title="异常告警" :value="stats.alerts" /></el-col>
    </el-row>

    <el-row :gutter="16" style="margin-bottom: 16px">
      <el-col :span="10">
        <el-card style="height: 260px; overflow: hidden">
          <div style="height: 100%">
            <MapContainer height="220px" />
          </div>
        </el-card>
      </el-col>
      <el-col :span="14">
        <el-card style="height: 260px; overflow: auto">
          <div
            style="
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
            "
          >
            <div style="font-weight: 600">待办事项</div>
            <el-button type="text" size="small">更多</el-button>
          </div>
          <el-skeleton :loading="loading" animated>
            <template #template>
              <el-skeleton-item variant="p" style="width: 100%" />
            </template>
            <template #default>
              <div>
                <div
                  v-for="it in todos"
                  :key="it.id"
                  style="
                    padding: 8px 0;
                    border-bottom: 1px solid #f0f0f0;
                    display: flex;
                    align-items: center;
                  "
                >
                  <el-checkbox v-model="it.done">{{ it.text }}</el-checkbox>
                </div>
              </div>
            </template>
          </el-skeleton>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <div ref="chartRef" style="height: 320px; width: 100%"></div>
    </el-card>
  </div>
</template>
