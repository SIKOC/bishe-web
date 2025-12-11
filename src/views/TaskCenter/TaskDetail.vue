<template>
  <el-card>
    <template #header>任务详情</template>
    <el-row :gutter="12">
      <el-col :span="8">
        <el-card>
          <template #header>任务进度</template>
          <el-progress :percentage="detail.progress" status="active" />
        </el-card>
        <el-card style="margin-top: 12px">
          <template #header>运单信息</template>
          <div>单号：{{ detail.waybill?.code }}</div>
          <div>重量：{{ detail.waybill?.weight }}</div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>飞行日志记录</template>
          <el-timeline>
            <el-timeline-item v-for="(l, i) in detail.logs" :key="i" :timestamp="l.time">{{
              l.text
            }}</el-timeline-item>
          </el-timeline>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card>
          <template #header>飞行轨迹回放</template>
          <div style="height: 220px"><MapContainer /></div>
        </el-card>
      </el-col>
    </el-row>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
import { useRoute } from 'vue-router'
import { fetchTaskDetail } from '@/api/task'

const route = useRoute()
const detail = ref<any>({ progress: 0, waybill: {}, logs: [] })
onMounted(async () => {
  detail.value = await fetchTaskDetail(String(route.params.id))
})
</script>
