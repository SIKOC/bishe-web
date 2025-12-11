<template>
  <el-card>
    <template #header>维护记录</template>
    <el-table :data="list" v-loading="loading">
      <el-table-column prop="id" label="#" width="60" />
      <el-table-column prop="drone" label="无人机" />
      <el-table-column prop="type" label="类型" />
      <el-table-column prop="time" label="时间" />
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchMaintenance } from '@/api/resources'

const list = ref<any[]>([])
const loading = ref(false)
onMounted(async () => {
  loading.value = true
  list.value = await fetchMaintenance()
  loading.value = false
})
</script>
