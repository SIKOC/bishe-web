<template>
  <div class="task-detail">
    <el-page-header @back="$router.back()" style="margin-bottom: 16px">
      <template #content>
        <span class="text-large font-600">任务详情 #{{ taskId }}</span>
      </template>
    </el-page-header>

    <el-row :gutter="16">
      <!-- 左侧信息 -->
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>任务信息</span>
              <el-tag :type="getStatusTagType(detail.status)" size="large">
                {{ getStatusText(detail.status) }}
              </el-tag>
            </div>
          </template>
          
          <el-descriptions :column="1" border>
            <el-descriptions-item label="任务类型">
              {{ getTaskTypeText(detail.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              <el-rate v-model="detail.priority" disabled :max="5" />
            </el-descriptions-item>
            <el-descriptions-item label="请求时间">
              {{ formatDateTime(detail.requestTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="预计到达">
              {{ formatDateTime(detail.expectedArrivalTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="实际到达" v-if="detail.actualArrivalTime">
              {{ formatDateTime(detail.actualArrivalTime) }}
            </el-descriptions-item>
            <el-descriptions-item label="关联无人机" v-if="detail.assignedDroneId">
              {{ detail.droneCode || `DRONE-${detail.assignedDroneId}` }}
            </el-descriptions-item>
            <el-descriptions-item label="备注">
              {{ detail.remarks || '无' }}
            </el-descriptions-item>
          </el-descriptions>

          <el-divider />

          <div class="action-buttons">
            <el-button
              v-if="detail.status === 'pending' && isAdmin"
              type="primary"
              @click="showAssignDialog = true"
            >
              分配无人机
            </el-button>
            <el-button
              v-if="detail.status === 'in_progress'"
              type="warning"
              @click="handleIntervene"
            >
              紧急干预
            </el-button>
            <el-button
              v-if="detail.status !== 'completed' && detail.status !== 'canceled'"
              type="danger"
              @click="handleCancel"
            >
              取消任务
            </el-button>
          </div>
        </el-card>

        <!-- 任务进度 -->
        <el-card shadow="hover" style="margin-top: 16px">
          <template #header>任务进度</template>
          <el-progress
            :percentage="progress"
            :status="getProgressStatus()"
            :stroke-width="20"
          />
          <div class="progress-info">
            <div class="progress-step" :class="{ active: progress >= 0 }">
              <el-icon><Check v-if="progress > 0" /><Clock v-else /></el-icon>
              <span>任务创建</span>
            </div>
            <div class="progress-step" :class="{ active: progress >= 25 }">
              <el-icon><Check v-if="progress >= 25" /><Clock v-else /></el-icon>
              <span>审核通过</span>
            </div>
            <div class="progress-step" :class="{ active: progress >= 50 }">
              <el-icon><Check v-if="progress >= 50" /><Clock v-else /></el-icon>
              <span>无人机起飞</span>
            </div>
            <div class="progress-step" :class="{ active: progress >= 75 }">
              <el-icon><Check v-if="progress >= 75" /><Clock v-else /></el-icon>
              <span>运输中</span>
            </div>
            <div class="progress-step" :class="{ active: progress >= 100 }">
              <el-icon><Check v-if="progress >= 100" /><Clock v-else /></el-icon>
              <span>任务完成</span>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧地图 -->
      <el-col :span="16">
        <el-card shadow="hover" class="map-card">
          <template #header>
            <div class="card-header">
              <span>实时位置追踪</span>
              <div class="header-actions">
                <el-tag v-if="connected" type="success" size="small">
                  <el-icon><CircleCheck /></el-icon>
                  实时连接
                </el-tag>
                <el-tag v-else type="danger" size="small">
                  <el-icon><CircleClose /></el-icon>
                  已断开
                </el-tag>
                <el-button size="small" text @click="refreshPosition">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </div>
            </div>
          </template>
          
          <div class="map-container">
            <MapContainer
              :markers="droneMarkers"
              :route="routePoints"
              :show-toolbar="true"
              @marker-click="handleMarkerClick"
              ref="mapRef"
            />
            <div class="map-legend" v-if="routePoints.length > 0">
              <div class="legend-item">
                <div class="legend-line" style="background: #1890ff;"></div>
                <span>规划路径（沿道路正上方）</span>
              </div>
              <div class="legend-item" v-if="trackPoints.length > 0">
                <div class="legend-line" style="background: #ff4d4f;"></div>
                <span>实时轨迹</span>
              </div>
            </div>
          </div>

          <!-- 路径信息卡片 -->
          <div v-if="routeInfo" class="route-info-card">
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="路径距离">
                <span class="info-value">{{ routeInfo.distance?.toFixed(2) || '-' }} 公里</span>
              </el-descriptions-item>
              <el-descriptions-item label="预计时长">
                <span class="info-value">{{ formatDuration(routeInfo.duration || 0) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="风险系数" v-if="routeInfo.riskFactor !== undefined">
                <el-progress
                  :percentage="(routeInfo.riskFactor * 100)"
                  :color="getRiskColor(routeInfo.riskFactor)"
                  :format="(val) => `${(val / 100).toFixed(2)}`"
                  :stroke-width="8"
                />
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- 任务调度属性 -->
          <div class="route-info-card">
            <el-descriptions :column="3" border size="small">
              <el-descriptions-item label="任务类别">
                <el-tag>{{ detail.taskCategory || '-' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="载重(kg)">
                {{ detail.weightKg || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="SLA(分钟)">
                {{ detail.slaMinutes || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="路径策略">
                <el-tag type="info">{{ detail.routeOptimizeStrategy || 'shortest' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="避开禁飞区">
                <el-tag :type="detail.avoidNoFlyZones ? 'success' : 'info'">{{ detail.avoidNoFlyZones ? '是' : '否' }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="考虑天气">
                <el-tag :type="detail.considerWeather ? 'success' : 'info'">{{ detail.considerWeather ? '是' : '否' }}</el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <!-- 无人机信息卡片 -->
          <div v-if="currentDrone" class="drone-info-card">
            <div class="info-header">
              <span class="drone-name">{{ currentDrone.label }}</span>
              <el-tag :type="getStatusTagType(currentDrone.status)" size="small">
                {{ getStatusText(currentDrone.status) }}
              </el-tag>
            </div>
            <div class="info-content">
              <div class="info-item">
                <span class="label">电量</span>
                <el-progress
                  :percentage="currentDrone.batteryLevel || 0"
                  :color="getBatteryColor(currentDrone.batteryLevel)"
                  :stroke-width="8"
                />
                <span class="value">{{ currentDrone.batteryLevel?.toFixed(1) || 0 }}%</span>
              </div>
              <div class="info-item" v-if="currentDrone.speed !== undefined">
                <span class="label">速度</span>
                <span class="value">{{ currentDrone.speed.toFixed(1) }} m/s</span>
              </div>
              <div class="info-item" v-if="currentDrone.altitude !== undefined">
                <span class="label">高度</span>
                <span class="value">{{ currentDrone.altitude.toFixed(1) }} m</span>
              </div>
              <div class="info-item" v-if="estimatedArrivalTime">
                <span class="label">预计到达</span>
                <span class="value">{{ formatDateTime(estimatedArrivalTime) }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 分配无人机对话框 -->
    <el-dialog v-model="showAssignDialog" title="分配无人机" width="600px">
      <el-form label-width="100px">
        <el-form-item label="选择无人机">
          <el-select v-model="assignForm.droneId" placeholder="请选择无人机" style="width: 100%">
            <el-option
              v-for="drone in availableDrones"
              :key="drone.droneId"
              :label="`${drone.droneCode} (电量: ${drone.batteryLevel}%)`"
              :value="drone.droneId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="handleAssign">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 任务详情页面
 * 显示任务详细信息、实时位置追踪、任务进度
 * @author System
 * @date 2025-01
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Clock, CircleCheck, CircleClose, Refresh } from '@element-plus/icons-vue'
import MapContainer from '@/components/MapContainer.vue'
import { fetchTaskDetail, assignTask, updateTaskStatus, getTaskTrack } from '@/api/task'
import { fetchDrones } from '@/api/drones'
import { getRouteDetail } from '@/api/route'
import { useWebSocket } from '@/hooks/useWebSocket'
import type { DroneMarker, RoutePoint } from '@/types/drone'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => Number(route.params.id))

const detail = ref<any>({
  taskId: 0,
  type: '',
  priority: 3,
  status: 'pending',
  requestTime: '',
  expectedArrivalTime: '',
  actualArrivalTime: '',
  assignedDroneId: null,
  droneCode: '',
  remarks: ''
})

const droneMarkers = ref<DroneMarker[]>([])
const routePoints = ref<RoutePoint[]>([])
const trackPoints = ref<RoutePoint[]>([]) // 实时轨迹点
const currentDrone = ref<DroneMarker | null>(null)
const connected = ref(false)
const showAssignDialog = ref(false)
const availableDrones = ref<any[]>([])
const assignForm = ref({ droneId: null as number | null })
const estimatedArrivalTime = ref<Date | null>(null)
const routeInfo = ref<{
  distance?: number
  duration?: number
  riskFactor?: number
} | null>(null)

// 计算进度
const progress = computed(() => {
  const statusMap: Record<string, number> = {
    'pending': 0,
    'approved': 25,
    'in_progress': 50,
    'completed': 100,
    'canceled': 0
  }
  return statusMap[detail.value.status] || 0
})

// 判断是否为管理员
const isAdmin = computed(() => {
  // TODO: 从store获取用户角色
  return true
})

// WebSocket连接
const wsUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_WS_BASE || window.location.origin.replace('http', 'ws')
  return `${baseUrl}/api/ws/task/${taskId.value}`
})

const ws = useWebSocket({
  url: wsUrl.value,
  autoReconnect: true,
  getToken: () => localStorage.getItem('access_token'),
  onOpen: () => {
    connected.value = true
    ws.subscribeTask(taskId.value)
  },
  onClose: () => {
    connected.value = false
  }
})

// 重写消息处理
ws.handleMessage = (message: any) => {
  if (message.type === 'task_drone_position') {
    const data = message.data
    currentDrone.value = {
      id: data.droneId,
      lat: data.latitude,
      lng: data.longitude,
      altitude: data.altitude,
      label: data.droneCode,
      status: 'flying',
      batteryLevel: data.batteryLevel,
      speed: data.speed,
      heading: data.heading,
      taskId: taskId.value
    }
    droneMarkers.value = currentDrone.value ? [currentDrone.value] : []
    
    if (data.route) {
      routePoints.value = data.route.map((p: any) => ({
        lng: p.lng,
        lat: p.lat,
        altitude: p.altitude
      }))
    }
    
    if (data.estimatedArrivalTime) {
      estimatedArrivalTime.value = new Date(data.estimatedArrivalTime)
    }
  } else if (message.type === 'task_status') {
    detail.value.status = message.data.status
    ElMessage.info(message.data.message || '任务状态已更新')
  }
}

/**
 * 加载任务详情
 */
const loadTaskDetail = async (): Promise<void> => {
  try {
    const res = await fetchTaskDetail(taskId.value)
    detail.value = res.data || res
    
    // 如果有路径ID，加载路径信息
    if (detail.value.routeId) {
      await loadRouteInfo(detail.value.routeId)
    }
    
    // 如果任务进行中，加载实时轨迹
    if (detail.value.status === 'in_progress' && detail.value.assignedDroneId) {
      await loadTaskTrack()
    }
  } catch (error) {
    ElMessage.error('加载任务详情失败')
    console.error(error)
  }
}

/**
 * 加载路径信息
 */
const loadRouteInfo = async (routeId: string): Promise<void> => {
  try {
    const result = await getRouteDetail(routeId)
    const distance = result.distance ?? result.distanceKm ?? 0
    const duration = result.duration ?? result.durationSeconds ?? 0
    routePoints.value = (result.points || []).map(p => ({
      lng: p.lng,
      lat: p.lat,
      altitude: p.altitude
    }))
    routeInfo.value = {
      distance,
      duration,
      riskFactor: result.riskFactor
    }
  } catch (error) {
    console.error('Failed to load route info:', error)
  }
}

/**
 * 加载任务实时轨迹
 */
const loadTaskTrack = async (): Promise<void> => {
  try {
    const result = await getTaskTrack(taskId.value)
    if (result.route && result.route.length > 0) {
      trackPoints.value = result.route.map((p: any) => ({
        lng: p.lng,
        lat: p.lat,
        timestamp: p.timestamp
      }))
      
      // 更新无人机当前位置
      if (result.currentPosition) {
        currentDrone.value = {
          id: detail.value.assignedDroneId,
          lat: result.currentPosition.lat,
          lng: result.currentPosition.lng,
          altitude: result.currentPosition.altitude,
          label: detail.value.droneCode || `DRONE-${detail.value.assignedDroneId}`,
          status: 'flying',
          speed: result.currentPosition.speed,
          heading: result.currentPosition.heading
        }
        droneMarkers.value = currentDrone.value ? [currentDrone.value] : []
      }
    }
  } catch (error) {
    console.error('Failed to load task track:', error)
  }
}

/**
 * 加载可用无人机列表
 */
const loadAvailableDrones = async (): Promise<void> => {
  try {
    const res = await fetchDrones({ status: 'idle', page: 1, pageSize: 100 })
    availableDrones.value = res.list || []
  } catch (error) {
    console.error('Failed to load drones:', error)
  }
}

/**
 * 刷新位置
 */
const refreshPosition = (): void => {
  loadTaskDetail()
  ElMessage.success('已刷新')
}

/**
 * 分配无人机
 */
const handleAssign = async (): Promise<void> => {
  if (!assignForm.value.droneId) {
    ElMessage.warning('请选择无人机')
    return
  }
  
  try {
    await assignTask(taskId.value, assignForm.value.droneId)
    ElMessage.success('分配成功')
    showAssignDialog.value = false
    await loadTaskDetail()
  } catch (error) {
    ElMessage.error('分配失败')
    console.error(error)
  }
}

/**
 * 取消任务
 */
const handleCancel = async (): Promise<void> => {
  try {
    await ElMessageBox.confirm('确定要取消此任务吗？', '提示', {
      type: 'warning'
    })
    await updateTaskStatus(taskId.value, 'canceled')
    ElMessage.success('任务已取消')
    await loadTaskDetail()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消任务失败')
      console.error(error)
    }
  }
}

/**
 * 紧急干预
 */
const handleIntervene = (): void => {
  ElMessageBox.prompt('请输入干预指令', '紧急干预', {
    inputPlaceholder: '如：立即返航、改变航线等'
  }).then(({ value }) => {
    // TODO: 调用干预接口
    ElMessage.success('干预指令已发送')
  }).catch(() => {
    // 用户取消
  })
}

/**
 * 处理标记点击
 */
const handleMarkerClick = (marker: DroneMarker): void => {
  currentDrone.value = marker
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status?: string): string => {
  const typeMap: Record<string, string> = {
    'pending': 'info',
    'approved': '',
    'in_progress': 'warning',
    'completed': 'success',
    'canceled': 'danger'
  }
  return typeMap[status || 'pending'] || ''
}

/**
 * 获取状态文本
 */
const getStatusText = (status?: string): string => {
  const textMap: Record<string, string> = {
    'pending': '待审核',
    'approved': '已审核',
    'in_progress': '进行中',
    'completed': '已完成',
    'canceled': '已取消'
  }
  return textMap[status || 'pending'] || '未知'
}

/**
 * 获取任务类型文本
 */
const getTaskTypeText = (type?: string): string => {
  const textMap: Record<string, string> = {
    'supplies_transport': '物资运输',
    'transfer_patient': '患者转运',
    'organ': '器官运输',
    'doctor_dispatch': '医生派遣'
  }
  return textMap[type || ''] || type || '未知'
}

/**
 * 获取进度状态
 */
const getProgressStatus = (): string => {
  if (detail.value.status === 'completed') return 'success'
  if (detail.value.status === 'canceled') return 'exception'
  return 'active'
}

/**
 * 获取电量颜色
 */
const getBatteryColor = (level?: number): string => {
  if (level === undefined) return '#d9d9d9'
  if (level < 10) return '#ff4d4f'
  if (level < 20) return '#faad14'
  return '#52c41a'
}

/**
 * 格式化日期时间
 */
const formatDateTime = (dateStr?: string): string => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

/**
 * 格式化时长
 */
const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟${secs}秒`
}

/**
 * 获取风险颜色
 */
const getRiskColor = (risk: number): string => {
  if (risk < 0.3) return '#52c41a'
  if (risk < 0.6) return '#faad14'
  return '#ff4d4f'
}

onMounted(async () => {
  await loadTaskDetail()
  if (detail.value.status === 'pending' && isAdmin.value) {
    await loadAvailableDrones()
  }
  ws.connect()
})

onBeforeUnmount(() => {
  ws.disconnect()
})
</script>

<style scoped lang="scss">
.task-detail {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.progress-info {
  margin-top: 16px;
  display: flex;
  justify-content: space-between;
}

.progress-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #999;
  font-size: 12px;
  
  &.active {
    color: #1890ff;
  }
}

.map-card {
  height: calc(100vh - 200px);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.map-container {
  flex: 1;
  min-height: 500px;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
}

.legend-line {
  width: 24px;
  height: 4px;
  border-radius: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drone-info-card {
  margin-top: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.route-info-card {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  
  .info-value {
    font-weight: 600;
    color: #1890ff;
    font-size: 14px;
  }
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.drone-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  
  .label {
    width: 60px;
    color: #666;
    font-size: 14px;
  }
  
  .value {
    color: #333;
    font-weight: 500;
  }
  
  :deep(.el-progress) {
    flex: 1;
  }
}
</style>
