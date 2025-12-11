<template>
  <el-row :gutter="12">
    <el-col :span="6"
      ><StatsCard title="今日运单" :value="stats.waybills" :icon="Document"
    /></el-col>
    <el-col :span="6"
      ><StatsCard title="在线无人机" :value="stats.online" :icon="MapLocation"
    /></el-col>
    <el-col :span="6"
      ><StatsCard title="异常告警" :value="stats.alerts" :icon="WarningFilled"
    /></el-col>
    <el-col :span="6"><StatsCard title="累计里程" :value="stats.mileage" :icon="Coin" /></el-col>
  </el-row>

  <el-row :gutter="12" style="margin-top: 12px">
    <el-col :span="8">
      <el-card>
        <div style="height: 220px">
          <MapContainer />
        </div>
      </el-card>
    </el-col>
    <el-col :span="16">
      <el-card>
        <ChartLine :x="concurrent.x" :y="concurrent.y" title="近24小时任务并发量" />
      </el-card>
    </el-col>
  </el-row>

  <el-row :gutter="12" style="margin-top: 12px">
    <el-col :span="8">
      <el-card>
        <template #header>待办事项</template>
        <el-timeline>
          <el-timeline-item v-for="(t, i) in todos" :key="i" :timestamp="t.time">{{
            t.text
          }}</el-timeline-item>
        </el-timeline>
      </el-card>
    </el-col>
    <el-col :span="16">
      <el-card>
        <template #header>消息提醒</template>
        <el-empty description="暂无消息" />
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import StatsCard from '@/components/StatsCard.vue'
import MapContainer from '@/components/MapContainer.vue'
import ChartLine from '@/components/ChartLine.vue'
import { Document, MapLocation, WarningFilled, Coin } from '@element-plus/icons-vue'
import { ref, onMounted } from 'vue'
import { fetchDashboardStats, fetchConcurrent24h } from '@/api/dashboard'

const stats = ref({ waybills: 0, online: 0, alerts: 0, mileage: 0 })
const concurrent = ref<{ x: string[]; y: number[] }>({ x: [], y: [] })
const todos = ref([
  { time: '09:00', text: '检查#03无人机电池' },
  { time: '10:30', text: '审核新任务申请' },
])

onMounted(async () => {
  stats.value = await fetchDashboardStats()
  concurrent.value = await fetchConcurrent24h()
})
</script>
