<template>
  <el-card>
    <template #header>无人机台账</template>
    <el-table :data="list" v-loading="loading" @row-click="open">
      <el-table-column prop="id" label="#" width="60" />
      <el-table-column prop="name" label="编号" width="120" />
      <el-table-column label="电量" width="200">
        <template #default="{ row }"><el-progress :percentage="row.battery" /></template>
      </el-table-column>
      <el-table-column label="信号" width="200">
        <template #default="{ row }"
          ><el-progress :percentage="row.signal" status="success"
        /></template>
      </el-table-column>
      <el-table-column prop="status" label="状态" />
    </el-table>
  </el-card>

  <el-drawer v-model="drawer" title="无人机详情" direction="rtl" size="40%">
    <div>硬件参数：四旋翼，载重 5kg</div>
    <div>维护历史：近 30 天 2 次</div>
    <div>当前挂载：冷链箱</div>
  </el-drawer>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useDroneStore } from '@/store/drone'

const drone = useDroneStore()
const list = computed(() => drone.list)
const loading = computed(() => drone.loading)
const drawer = ref(false)
const open = () => {
  drawer.value = true
}
onMounted(() => drone.load())
</script>
