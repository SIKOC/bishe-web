<script setup lang="ts">
import { ref, onMounted } from 'vue'
import DroneTable from '../components/DroneTable.vue'
import DroneForm from '../components/DroneForm.vue'
import { fetchDrones, createDrone, updateDrone, deleteDrone } from '../api/drones'
import type { Drone } from '../types'

const list = ref<Drone[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)
const showForm = ref(false)
const editData = ref<Drone | null>(null)

async function load() {
  loading.value = true
  const res = await fetchDrones({ page: page.value, pageSize: pageSize.value })
  list.value = res.list
  total.value = res.total
  loading.value = false
}

function handleAdd() {
  editData.value = null
  showForm.value = true
}

function handleEdit(d: Drone) {
  editData.value = d
  showForm.value = true
}

async function handleSubmit(payload: any) {
  if (payload.id) await updateDrone(payload.id, payload)
  else await createDrone(payload)
  showForm.value = false
  await load()
}

async function handleDelete(d: Drone) {
  await deleteDrone(d.id)
  await load()
}

onMounted(load)

function handlePageChange(p: number) {
  page.value = p
  load()
}
</script>

<template>
  <div>
    <div style="display: flex; justify-content: space-between; margin-bottom: 12px">
      <div>
        <el-input placeholder="搜索编号/型号" style="width: 240px" />
        <el-button style="margin-left: 8px" @click="load">搜索</el-button>
      </div>
      <div>
        <el-button type="primary" @click="handleAdd">新增</el-button>
      </div>
    </div>

    <el-card>
      <DroneTable :data="list" :total="total" @edit="handleEdit" @delete="handleDelete" />
      <div style="margin-top: 12px; text-align: right">
        <el-pagination
          :current-page="page"
          :page-size="pageSize"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <DroneForm v-model:visible="showForm" :editData="editData" @submit="handleSubmit" />
  </div>
</template>
