<template>
  <el-card>
    <template #header>
      <div style="display:flex; justify-content:space-between; align-items:center">
        <span>无人机台账</span>
        <el-button type="primary" size="small" @click="showAdd">新增无人机</el-button>
      </div>
    </template>
    <el-table :data="list" v-loading="loading" @row-click="open" stripe>
      <el-table-column label="无人机信息" min-width="180">
        <template #default="{ row }">
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: bold; font-size: 16px; color: #E5EAF3;">{{ row.drone_code }}</span>
            <span style="color: #A3A6AD; font-size: 13px; margin-top: 4px;">{{ row.model || '未知型号' }}</span>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="性能指标" min-width="240">
        <template #default="{ row }">
          <el-space wrap :size="8">
            <el-tag size="small" effect="dark" color="#337ecc" style="border:none">载重 {{ row.capacity }}kg</el-tag>
            <el-tag size="small" effect="dark" color="#529b2e" style="border:none" v-if="row.max_speed">速度 {{ row.max_speed }}km/h</el-tag>
            <el-tag size="small" effect="dark" color="#b88230" style="border:none" v-if="row.range_km">航程 {{ row.range_km }}km</el-tag>
          </el-space>
        </template>
      </el-table-column>

      <el-table-column label="状态/电量" width="240">
        <template #default="{ row }">
          <div style="display: flex; align-items: center; gap: 15px;">
            <el-tag :type="getStatusType(row.status)" effect="dark">{{ formatStatus(row.status) }}</el-tag>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <el-progress 
                :percentage="row.battery_level || 0" 
                :status="getBatteryStatus(row.battery_level)"
                :show-text="false"
                :stroke-width="10"
              />
              <span style="font-size: 12px; color: #CFD3DC; text-align: right;">
                {{ row.battery_level ? row.battery_level + '%' : '未连接' }}
              </span>
            </div>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="所属基地" width="150">
        <template #default="{ row }">
          <span style="color: #E5EAF3;">{{ getHospitalName(row.hospital_id) }}</span>
        </template>
      </el-table-column>
    </el-table>
  </el-card>

  <el-drawer v-model="drawer" title="无人机详情" direction="rtl" size="40%">
    <div v-if="selectedDrone" class="drone-detail">
      <h3>{{ selectedDrone.drone_code }} <span style="font-size:14px; font-weight:normal; color:#909399">{{ selectedDrone.model }}</span></h3>
      <div style="margin-top: 20px">
        <p><strong>状态：</strong>{{ formatStatus(selectedDrone.status) }}</p>
        <p><strong>电量：</strong>{{ selectedDrone.battery_level ? selectedDrone.battery_level + '%' : '未连接' }}</p>
        <p><strong>性能：</strong>载重 {{ selectedDrone.capacity }}kg / 速度 {{ selectedDrone.max_speed }}km/h / 航程 {{ selectedDrone.range_km }}km</p>
        <p><strong>所属基地：</strong>{{ getHospitalName(selectedDrone.hospital_id) }}</p>
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
      <el-form-item label="型号">
        <el-input v-model="addForm.model" placeholder="例如：Mavic 3 Enterprise" />
      </el-form-item>
      <el-form-item label="最大载重">
        <el-input-number v-model="addForm.capacity" :min="0.1" :precision="1" /> kg
      </el-form-item>
      <el-form-item label="最大速度">
        <el-input-number v-model="addForm.max_speed" :min="0" /> km/h
      </el-form-item>
      <el-form-item label="最大高度">
        <el-input-number v-model="addForm.max_altitude" :min="0" /> m
      </el-form-item>
      <el-form-item label="续航时间">
        <el-input-number v-model="addForm.endurance_minutes" :min="0" /> min
      </el-form-item>
      <el-form-item label="最大航程">
        <el-input-number v-model="addForm.range_km" :min="0" /> km
      </el-form-item>
      <el-form-item label="所属基地">
        <el-select v-model="addForm.hospital_id">
          <el-option
            v-for="h in hospitals"
            :key="h.hospitalId"
            :label="h.name"
            :value="h.hospitalId"
          />
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
import request from '@/utils/request'

const drone = useDroneStore()
const list = computed(() => drone.list)
const loading = computed(() => drone.loading)
const drawer = ref(false)
const selectedDrone = ref<any>(null)
const maintenanceRecords = ref<any[]>([])
const hospitals = ref<any[]>([])

const addVisible = ref(false)
const addForm = ref({
  drone_code: '',
  model: '',
  capacity: 5,
  max_speed: 60,
  max_altitude: 500,
  endurance_minutes: 30,
  range_km: 10,
  hospital_id: 1,
})

const open = async (row: any) => {
  selectedDrone.value = row
  drawer.value = true
  // Mock fetching maintenance for this drone
  const allRecords = await fetchMaintenance()
  maintenanceRecords.value = allRecords.filter((r: any) => r.drone === row.id)
}

const loadHospitals = async () => {
  try {
    const res: any = await request.get('/hospital/list')
    hospitals.value = res?.data?.list || res?.list || []
  } catch (e) {
    hospitals.value = [
      { hospitalId: 1, name: '市立医院', lng: 112.9388, lat: 28.2282 },
      { hospitalId: 2, name: '中心医院', lng: 113.0000, lat: 28.2000 },
    ]
  }
}

const showAdd = async () => {
  if (hospitals.value.length === 0) await loadHospitals()
  addForm.value = {
    drone_code: 'DR-' + Math.floor(Math.random() * 1000),
    model: '',
    capacity: 5,
    max_speed: 60,
    max_altitude: 500,
    endurance_minutes: 30,
    range_km: 10,
    hospital_id: hospitals.value[0]?.hospitalId || 1,
  }
  addVisible.value = true
}

const confirmAdd = async () => {
  const hospital = hospitals.value.find((h) => h.hospitalId === addForm.value.hospital_id)
  const payload = {
    ...addForm.value,
    current_lng: hospital?.lng || 112.9388,
    current_lat: hospital?.lat || 28.2282,
  }
  await createDrone(payload)
  ElMessage.success('添加成功')
  addVisible.value = false
  drone.load()
}

const getStatusType = (status: string) => {
  const map: any = { idle: 'success', flying: 'primary', charging: 'warning', maintenance: 'danger' }
  return map[status] || 'info'
}

const formatStatus = (status: string) => {
  const map: any = { idle: '空闲', flying: '飞行中', charging: '充电中', maintenance: '维护中' }
  return map[status] || status
}

const getBatteryStatus = (level: number | null) => {
  if (level === null) return ''
  if (level > 80) return 'success'
  if (level < 20) return 'exception'
  return 'warning'
}

const getHospitalName = (id: number) => {
  const h = hospitals.value.find((i: any) => i.hospitalId === id)
  return h ? h.name : `基地 #${id}`
}

onMounted(() => {
  drone.load()
  loadHospitals()
})
</script>

<style scoped>
.drone-detail {
  color: #303133;
}
.drone-detail p {
  margin-bottom: 12px;
  line-height: 1.6;
}
</style>
