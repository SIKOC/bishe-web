<template>
  <el-row :gutter="12">
    <el-col :span="12">
      <el-card>
        <template #header>列表</template>
        <el-table :data="list" v-loading="loading">
          <el-table-column prop="id" label="#" width="60" />
          <el-table-column prop="name" label="名称" />
          <el-table-column prop="lat" label="纬度" />
          <el-table-column prop="lng" label="经度" />
        </el-table>
      </el-card>
      <el-card style="margin-top: 12px">
        <template #header>新增停机坪</template>
        <el-form :model="form" label-width="80px">
          <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
          <el-form-item label="经度"><el-input-number v-model="form.lng" /></el-form-item>
          <el-form-item label="纬度"><el-input-number v-model="form.lat" /></el-form-item>
          <el-form-item><el-button type="primary" @click="add">新增</el-button></el-form-item>
        </el-form>
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card>
        <template #header>地图点位管理</template>
        <div style="height: 420px"><MapContainer /></div>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { fetchLocations } from '@/api/resources'
import { ElMessage } from 'element-plus'
import MapContainer from '@/components/MapContainer.vue'

const list = ref<any[]>([])
const loading = ref(false)
const form = ref({ name: '', lng: 121.45, lat: 31.2 })
onMounted(async () => {
  loading.value = true
  list.value = await fetchLocations()
  loading.value = false
})
const add = () => {
  list.value.push({ id: list.value.length + 1, ...form.value })
  ElMessage.success('已新增停机坪')
}
</script>
