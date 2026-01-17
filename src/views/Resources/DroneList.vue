<template>
  <el-card>
    <template #header>
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span>无人机台账</span>
        <el-button type="primary" size="small" @click="showAdd">新增无人机</el-button>
      </div>
    </template>
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
      <el-table-column prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === 'maintenance' ? 'danger' : row.status === 'flying' ? 'warning' : 'success'">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-drawer v-model="drawer" title="无人机详情" direction="rtl" size="40%">
    <div v-if="selectedDrone">
      <h3>{{ selectedDrone.name }}</h3>
      <div style="margin-top: 20px">
        <p><strong>状态：</strong>{{ selectedDrone.status }}</p>
        <p><strong>电量：</strong>{{ selectedDrone.battery }}%</p>
        <p><strong>硬件参数：</strong>四旋翼，载重 5kg</p>
        <p><strong>当前挂载：</strong>冷链箱</p>
      </div>
      <el-divider />
      <h4>维护历史</h4>
      <el-table :data="maintenanceRecords" style="width: 100%" empty-text="暂无记录">
        <el-table-column prop="time" label="时间" />
        <el-table-column prop="type" label="类型" />
      </el-table>
    </div>
  </el-drawer>

  <el-dialog v-model="addVisible" title="新增无人机" width="30%">
    <el-form label-width="80px">
      <el-form-item label="编号">
        <el-input v-model="addForm.drone_code" placeholder="DR-XXXX" />
      </el-form-item>
      <el-form-item label="最大载重">
        <el-input-number v-model="addForm.capacity" :min="1" :max="50" /> kg
      </el-form-item>
      <el-form-item label="所属基地">
        <el-select v-model="addForm.hospital_id">
          <el-option label="市立医院" :value="1" />
          <el-option label="中心医院" :value="2" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="addVisible = false">取消</el-button>
      <el-button type="primary" @click="confirmAdd">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { onMounted, computed, ref } from 'vue'
import { useDroneStore } from '@/stores/drone'
import { fetchMaintenance } from '@/api/resources'
import { createDrone } from '@/api/drones'
import { ElMessage } from 'element-plus'

const drone = useDroneStore()
const list = computed(() => drone.list)
const loading = computed(() => drone.loading)
const drawer = ref(false)
const selectedDrone = ref<any>(null)
const maintenanceRecords = ref<any[]>([])

const addVisible = ref(false)
const addForm = ref({ drone_code: '', capacity: 5, hospital_id: 1 })

const open = async (row: any) => {
  selectedDrone.value = row
  drawer.value = true
  // Mock fetching maintenance for this drone
  const allRecords = await fetchMaintenance()
  maintenanceRecords.value = allRecords.filter((r: any) => r.drone === row.id)
}

const showAdd = () => {
  addForm.value = { drone_code: 'DR-' + Math.floor(Math.random()*1000), capacity: 5, hospital_id: 1 }
  addVisible.value = true
}

const confirmAdd = async () => {
  await createDrone(addForm.value)
  ElMessage.success('添加成功')
  addVisible.value = false
  drone.load()
}

onMounted(() => drone.load())
</script>
