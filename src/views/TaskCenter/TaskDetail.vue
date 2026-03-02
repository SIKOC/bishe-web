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
        <el-card shadow="hover" class="info-card">
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
              v-if="['pending', 'pending_review', 'pending_approval', '待调度', '待审核'].includes(detail.status) && isAdmin"
              type="primary"
              @click="showAssignDialog = true"
            >
              分配无人机
            </el-button>
            <el-button
              v-if="detail.status === 'approved' && isAdmin"
              type="success"
              @click="handleTakeoff"
            >
              开始执行
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
        <el-card shadow="hover" class="progress-card" style="margin-top: 16px">
          <template #header>任务进度</template>
          <div style="text-align: center; margin-bottom: 20px;">
            <span class="progress-time" v-if="detail.requestTime">创建于: {{ formatDateTime(detail.requestTime) }}</span>
          </div>
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
            <div class="trip-badges" v-if="currentDrone">
              <el-tag size="small" effect="dark" type="info">速度 {{ currentDrone.speed?.toFixed?.(1) || '-' }} m/s</el-tag>
              <el-tag size="small" effect="dark" type="warning">电量 {{ currentDrone.batteryLevel?.toFixed?.(0) || '-' }}%</el-tag>
              <el-tag size="small" effect="dark" type="success">高度 {{ currentDrone.altitude?.toFixed?.(0) || '-' }} m</el-tag>
            </div>
          </template>
          
          <div class="map-container">
            <MapContainer
              :markers="droneMarkers"
              :route="routePoints"
              :show-toolbar="true"
              :coord-type="coordType"
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

          <!-- 行程概览 -->
          <div class="route-info-card">
            <div class="replay-header">
              <span>行程概览</span>
              <el-tag size="small" type="info">实时</el-tag>
            </div>
            <div class="trip-summary">
              <div class="trip-point">
                <div class="dot start"></div>
                <div class="label">起点</div>
                <div class="value">{{ detail.originName || detail.origin_name || originText }}</div>
              </div>
              <div class="trip-point">
                <div class="dot end"></div>
                <div class="label">终点</div>
                <div class="value">{{ detail.destName || detail.dest_name || destText }}</div>
              </div>
              <div class="trip-metrics">
                <div class="metric">
                  <div class="metric-label">预计到达</div>
                  <div class="metric-value">{{ etaText }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">剩余时间</div>
                  <div class="metric-value">{{ etaCountdownText }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">剩余距离</div>
                  <div class="metric-value">{{ remainingDistanceText }}</div>
                </div>
                <div class="metric">
                  <div class="metric-label">总距离</div>
                  <div class="metric-value">{{ detail.totalDistanceKm ? detail.totalDistanceKm.toFixed(2) + ' km' : '-' }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 轨迹回放 -->
          <div v-if="trackPoints.length > 0" class="route-info-card">
            <div class="replay-header">
              <span>轨迹回放</span>
              <el-tag size="small" type="info">点数 {{ trackPoints.length }}</el-tag>
            </div>
            <div class="replay-controls">
              <el-button size="small" @click="toggleReplay">
                <el-icon>
                  <component :is="replayPlaying ? 'VideoPause' : 'VideoPlay'" />
                </el-icon>
                {{ replayPlaying ? '暂停' : '播放' }}
              </el-button>
              <el-button-group>
                <el-button size="small" :type="replaySpeed === 1 ? 'primary' : 'default'" @click="setReplaySpeed(1)">1x</el-button>
                <el-button size="small" :type="replaySpeed === 2 ? 'primary' : 'default'" @click="setReplaySpeed(2)">2x</el-button>
                <el-button size="small" :type="replaySpeed === 4 ? 'primary' : 'default'" @click="setReplaySpeed(4)">4x</el-button>
              </el-button-group>
              <el-button size="small" @click="resetReplay">重置</el-button>
            </div>
            <el-slider v-model="replayIndex" :max="trackPoints.length - 1" :min="0" />
            <div class="replay-timeline">
              <div class="timeline-track">
                <div class="timeline-progress" :style="{ width: `${replayProgress}%` }"></div>
                <div class="timeline-thumb" :style="{ left: `${replayProgress}%` }"></div>
              </div>
              <div class="timeline-ticks">
                <span v-for="(t, i) in timeTicks" :key="i" class="tick">{{ t }}</span>
              </div>
              <div class="timeline-labels">
                <span>{{ trackStartTime }}</span>
                <span>{{ trackCurrentTime }}</span>
                <span>{{ trackEndTime }}</span>
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
                  :format="formatRisk"
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

          <!-- 告警中心 -->
          <div class="route-info-card">
            <div class="replay-header">
              <span>告警中心</span>
              <el-tag size="small" type="danger" v-if="alerts.length">告警 {{ alerts.length }}</el-tag>
              <el-tag size="small" type="success" v-else>正常</el-tag>
            </div>
            <el-empty v-if="alerts.length === 0" description="暂无告警" :image-size="60" />
            <div v-else class="alert-list">
              <el-alert
                v-for="(a, i) in alerts"
                :key="i"
                :title="a.title"
                :description="a.detail"
                :type="a.level"
                :closable="false"
                show-icon
                style="margin-top: 8px"
              />
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
              :key="drone.id"
              :label="`${drone.model} (电量: ${drone.battery}%)`"
              :value="drone.id"
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
import { fetchDrones, fetchDrone } from '@/api/drones'
import { getRouteDetail } from '@/api/route'
import { useWebSocket } from '@/hooks/useWebSocket'
import request from '@/utils/request'
import type { DroneMarker, RoutePoint } from '@/types/drone'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => Number(route.params.id))
const coordType = ref<'gcj02' | 'wgs84' | 'bd09'>('gcj02')

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
  remarks: '',
  originName: '',
  destName: '',
  totalDistanceKm: 0,
  estTimeMin: 0
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
const mapRef = ref<any>(null)
const alerts = ref<{ title: string; detail: string; level: 'warning' | 'error' | 'info' }[]>([])
const replayIndex = ref(0)
const replayPlaying = ref(false)
const replaySpeed = ref(1)
let replayTimer: number | null = null

const replayProgress = computed(() => {
  if (trackPoints.value.length <= 1) return 0
  return Math.round((replayIndex.value / (trackPoints.value.length - 1)) * 100)
})

const trackStartTime = computed(() => formatTrackTime(trackPoints.value[0]?.timestamp))
const trackEndTime = computed(() => formatTrackTime(trackPoints.value[trackPoints.value.length - 1]?.timestamp))
const trackCurrentTime = computed(() => formatTrackTime(trackPoints.value[replayIndex.value]?.timestamp))
const routeInfo = ref<{
  distance?: number
  duration?: number
  riskFactor?: number
} | null>(null)
const nowTick = ref(Date.now())
let timer: number | null = null

const originText = computed(() => {
  return (
    detail.value.originName ||
    detail.value.originAddress ||
    detail.value.origin ||
    (detail.value.origin_lng && detail.value.origin_lat ? formatCoord(detail.value.origin_lng, detail.value.origin_lat) : '-')
  )
})
const destText = computed(() => {
  return (
    detail.value.destName ||
    detail.value.destAddress ||
    detail.value.destination ||
    (detail.value.dest_lng && detail.value.dest_lat ? formatCoord(detail.value.dest_lng, detail.value.dest_lat) : '-')
  )
})

const remainingDistanceKm = computed(() => {
  // 还没开始或者没有无人机位置，显示总里程
  if ((!currentDrone.value || detail.value.status === 'pending' || detail.value.status === 'approved') && routeInfo.value?.distance) {
     return routeInfo.value.distance
  }
  
  if (!currentDrone.value || routePoints.value.length < 2) return 0
  const idx = findClosestRouteIndex(currentDrone.value, routePoints.value)
  if (idx >= routePoints.value.length - 1) return 0
  let sum = 0
  for (let i = idx; i < routePoints.value.length - 1; i++) {
    sum += haversineMeters(routePoints.value[i], routePoints.value[i + 1])
  }
  return sum / 1000
})
const remainingDistanceText = computed(() => {
  if (!routePoints.value.length) return '-'
  return `${remainingDistanceKm.value.toFixed(2)} km`
})

const etaText = computed(() => {
  if (estimatedArrivalTime.value) return formatDateTime(estimatedArrivalTime.value)
  
  // 飞行中：根据剩余距离和速度计算
  if (currentDrone.value?.speed && remainingDistanceKm.value > 0) {
    const seconds = (remainingDistanceKm.value * 1000) / currentDrone.value.speed
    const eta = new Date(Date.now() + seconds * 1000)
    return formatDateTime(eta)
  }
  
  // 未开始：根据规划时长计算
  if (detail.value.status !== 'completed' && detail.value.status !== 'canceled' && routeInfo.value?.duration) {
     return formatDateTime(new Date(Date.now() + routeInfo.value.duration * 1000))
  }

  // 兜底逻辑：如果有预计到达时间则显示，否则显示未开始
  return detail.value.expectedArrivalTime ? formatDateTime(detail.value.expectedArrivalTime) : '-'
})

const etaTimestamp = computed(() => {
  if (estimatedArrivalTime.value) return estimatedArrivalTime.value.getTime()
  if (currentDrone.value?.speed && remainingDistanceKm.value > 0) {
    return Date.now() + (remainingDistanceKm.value * 1000) / currentDrone.value.speed * 1000
  }
  if (detail.value.expectedArrivalTime) {
    const ts = new Date(detail.value.expectedArrivalTime).getTime()
    return Number.isNaN(ts) ? null : ts
  }
  return null
})

const etaCountdownText = computed(() => {
  if (!etaTimestamp.value) return '-'
  const diff = etaTimestamp.value - nowTick.value
  if (diff <= 0) return '已到达'
  const totalSeconds = Math.floor(diff / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
})

const timeTicks = computed(() => {
  const list: string[] = []
  const n = trackPoints.value.length
  if (n === 0) return list
  const indices = [0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1]
  const unique = Array.from(new Set(indices))
  unique.forEach(i => list.push(formatTrackTime(trackPoints.value[i]?.timestamp)))
  return list
})

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
  const baseUrl = import.meta.env.VITE_NETTY_WS_BASE || 'ws://localhost:18080'
  return `${baseUrl}/ws`
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
  if (message.type === 'alert') {
    const alert = message.data || {}
    alerts.value.unshift({
      title: alert.title || '任务告警',
      detail: alert.detail || alert.message || '出现异常，请关注',
      level: alert.level || 'warning'
    })
    return
  }

  if (message.type === 'task_status') {
    detail.value.status = message.data.status
    ElMessage.info(message.data.message || '任务状态已更新')
    return
  }

  if (message.type === 'task_drone_position' || message.type === 'drone_position') {
    const data = message.data || message
    if (data.taskId && data.taskId !== taskId.value) return

    const position: DroneMarker = {
      id: data.droneId || detail.value.assignedDroneId || 0,
      lat: data.latitude ?? data.lat,
      lng: data.longitude ?? data.lng,
      altitude: data.altitude,
      label: data.droneCode || detail.value.droneCode || `DRONE-${data.droneId || detail.value.assignedDroneId}`,
      status: 'flying',
      batteryLevel: data.batteryLevel ?? data.battery,
      speed: data.speed,
      heading: data.heading,
      taskId: taskId.value
    }
    if (!replayPlaying.value) {
      currentDrone.value = position
      droneMarkers.value = [position]
    }

    if (data.route) {
      routePoints.value = data.route.map((p: any) => ({
        lng: p.lng,
        lat: p.lat,
        altitude: p.altitude
      }))
    }

    if (position.lat && position.lng) {
      trackPoints.value.push({
        lng: position.lng,
        lat: position.lat,
        altitude: position.altitude,
        timestamp: Date.now()
      })
      if (trackPoints.value.length > 2000) {
        trackPoints.value.shift()
      }
      mapRef.value?.updateTrack?.(trackPoints.value)
      checkAlerts(position)
    }

    if (data.estimatedArrivalTime) {
      estimatedArrivalTime.value = new Date(data.estimatedArrivalTime)
    }
  }
}

/**
 * 加载任务详情
 */
const loadTaskDetail = async (): Promise<void> => {
  try {
    const res = await fetchTaskDetail(taskId.value)
    const rawData = res.data || res
    
    // Map backend snake_case fields to frontend expected fields if needed
    // Although fetchTaskDetail already does mapping, double check here
    detail.value = {
      ...rawData,
      status: rawData.status || 'pending',
      type: rawData.type || rawData.taskType || 'unknown',
      originName: rawData.originName || rawData.origin_name,
      destName: rawData.destName || rawData.dest_name || rawData.destination_name,
      totalDistanceKm: rawData.totalDistanceKm || rawData.total_distance_km,
      estTimeMin: rawData.estTimeMin || rawData.est_time_min,
      weightKg: rawData.weightKg || rawData.weight_kg,
      slaMinutes: rawData.slaMinutes || rawData.sla_minutes,
      taskCategory: rawData.taskCategory || rawData.task_category,
      routeOptimizeStrategy: rawData.routeOptimizeStrategy || rawData.route_optimize_strategy,
      avoidNoFlyZones: rawData.avoidNoFlyZones ?? rawData.avoid_no_fly_zones,
      considerWeather: rawData.considerWeather ?? rawData.consider_weather
    }
    
    // V7: 使用 plannedPath 而不是 routeId
    if (detail.value.plannedPath && detail.value.plannedPath.length > 0) {
      routePoints.value = detail.value.plannedPath.map((p: any) => ({
        lng: p[0] || p.lng, // 兼容 [lng, lat] 或 {lng, lat}
        lat: p[1] || p.lat,
        altitude: p[2] || p.altitude || 100
      }))
      routeInfo.value = {
        distance: detail.value.totalDistanceKm || 0,
        duration: (detail.value.estTimeMin || 0) * 60,
        riskFactor: 0.2 // 默认风险系数
      }
    } else if (detail.value.routeId) {
      // 兼容旧逻辑
      await loadRouteInfo(detail.value.routeId)
    }
    
    // 如果任务进行中，加载实时轨迹
    if (detail.value.status === 'in_progress' && detail.value.assignedDroneId) {
      await loadTaskTrack()
    } else if (detail.value.status === 'approved' && detail.value.assignedDroneId) {
       // 如果已分配但未开始，获取无人机当前位置
       await loadAssignedDrone(detail.value.assignedDroneId)
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
        } as DroneMarker
        droneMarkers.value = currentDrone.value ? [currentDrone.value] : []
        mapRef.value?.updateTrack?.(trackPoints.value)
        checkAlerts(currentDrone.value)
      }
    }
  } catch (error) {
    console.error('Failed to load task track:', error)
  }
}

/**
 * 加载已分配的无人机位置
 */
const loadAssignedDrone = async (droneId: number): Promise<void> => {
  try {
    const drone = await fetchDrone(droneId)
    if (drone && drone.lng && drone.lat) {
       currentDrone.value = {
        id: drone.id,
        lat: drone.lat,
        lng: drone.lng,
        altitude: drone.altitude,
        label: detail.value.droneCode || `DRONE-${drone.id}`,
        status: drone.status,
        batteryLevel: drone.battery,
        speed: drone.speed,
        taskId: taskId.value
      } as DroneMarker
      droneMarkers.value = [currentDrone.value]
      // 不添加轨迹，只显示当前位置
    }
  } catch (error) {
    console.error('Failed to load assigned drone:', error)
  }
}

/**
 * 加载可用无人机列表
 */
const loadAvailableDrones = async (): Promise<void> => {
  try {
    // 强制只查询 idle 状态的无人机
    const res = await fetchDrones({ status: 'idle', page: 1, pageSize: 100 })
    // 前端二次过滤，确保安全
    availableDrones.value = (res.list || []).filter((d: any) => d.status === 'idle')
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
 * 执行任务（起飞）
 */
const handleTakeoff = async (): Promise<void> => {
  try {
    await updateTaskStatus(taskId.value, 'in_progress')
    ElMessage.success('任务开始，无人机已起飞')
    await loadTaskDetail()
  } catch (error) {
    ElMessage.error('启动任务失败')
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
 * 轨迹回放控制
 */
const toggleReplay = (): void => {
  if (replayPlaying.value) {
    stopReplay()
  } else {
    startReplay()
  }
}

const setReplaySpeed = (speed: number): void => {
  replaySpeed.value = speed
  if (replayPlaying.value) {
    stopReplay()
    startReplay()
  }
}

const startReplay = (): void => {
  if (trackPoints.value.length === 0) return
  replayPlaying.value = true
  if (replayTimer) window.clearInterval(replayTimer)
  replayTimer = window.setInterval(() => {
    if (replayIndex.value >= trackPoints.value.length - 1) {
      stopReplay()
      return
    }
    replayIndex.value += 1
    applyReplayPoint()
  }, 1000 / replaySpeed.value)
}

const stopReplay = (): void => {
  replayPlaying.value = false
  if (replayTimer) {
    window.clearInterval(replayTimer)
    replayTimer = null
  }
}

const resetReplay = (): void => {
  replayIndex.value = 0
  applyReplayPoint()
}

const applyReplayPoint = (): void => {
  const point = trackPoints.value[replayIndex.value]
  if (!point) return
  currentDrone.value = {
    id: currentDrone.value?.id || detail.value.assignedDroneId || 0,
    lat: point.lat,
    lng: point.lng,
    altitude: point.altitude,
    label: currentDrone.value?.label || detail.value.droneCode || 'DRONE',
    status: 'flying',
    taskId: taskId.value
  } as DroneMarker
  droneMarkers.value = currentDrone.value ? [currentDrone.value] : []
  mapRef.value?.updateReplaySegment?.(trackPoints.value.slice(0, replayIndex.value + 1))
}

watch(replayIndex, () => {
  if (!replayPlaying.value) applyReplayPoint()
})

watch(trackPoints, (val: RoutePoint[]) => {
  if (val.length > 0) {
    mapRef.value?.updateTrack?.(val)
    if (!replayPlaying.value) {
      replayIndex.value = val.length - 1
      applyReplayPoint()
    }
  }
}, { deep: true })

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
const formatDateTime = (dateStr?: string | Date | number[]): string => {
  if (!dateStr) return '-'
  let date: Date
  if (Array.isArray(dateStr)) {
    // Handle array [y, m, d, h, m, s]
    date = new Date(dateStr[0], dateStr[1] - 1, dateStr[2], dateStr[3], dateStr[4], dateStr[5])
  } else {
    date = dateStr instanceof Date ? dateStr : new Date(dateStr)
  }
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

const formatRisk = (val: number): string => {
  return `${(val / 100).toFixed(2)}`
}

/**
 * 告警检测
 */
const checkAlerts = (position: DroneMarker): void => {
  const now = Date.now()
  const slaMinutes = detail.value.slaMinutes || 0
  if (slaMinutes && detail.value.requestTime) {
    const start = new Date(detail.value.requestTime).getTime()
    const deadline = start + slaMinutes * 60 * 1000
    if (now > deadline) {
      pushAlert('任务超时', '已超过SLA时限', 'error')
    }
  }

  if (routePoints.value.length > 1) {
    const dist = getMinDistanceToRoute(position, routePoints.value)
    if (dist > 200) {
      pushAlert('偏航告警', `当前偏离航线约 ${Math.round(dist)} 米`, 'warning')
    }
  }
}

const pushAlert = (title: string, detailText: string, level: 'warning' | 'error' | 'info'): void => {
  if (alerts.value.find(a => a.title === title && a.detail === detailText)) return
  alerts.value.unshift({ title, detail: detailText, level })
}

const getMinDistanceToRoute = (pos: DroneMarker, route: RoutePoint[]): number => {
  let min = Number.MAX_VALUE
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]
    const b = route[i + 1]
    const d = distancePointToSegmentMeters(pos, a, b)
    min = Math.min(min, d)
  }
  return min
}

const distancePointToSegmentMeters = (p: RoutePoint, a: RoutePoint, b: RoutePoint): number => {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const refLat = (a.lat + b.lat) / 2
  const ax = toRad(a.lng) * Math.cos(toRad(refLat)) * R
  const ay = toRad(a.lat) * R
  const bx = toRad(b.lng) * Math.cos(toRad(refLat)) * R
  const by = toRad(b.lat) * R
  const px = toRad(p.lng) * Math.cos(toRad(refLat)) * R
  const py = toRad(p.lat) * R

  const abx = bx - ax
  const aby = by - ay
  const apx = px - ax
  const apy = py - ay
  const ab2 = abx * abx + aby * aby
  const t = ab2 === 0 ? 0 : Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2))
  const cx = ax + t * abx
  const cy = ay + t * aby
  const dx = px - cx
  const dy = py - cy
  return Math.sqrt(dx * dx + dy * dy)
}

const formatTrackTime = (timestamp?: number): string => {
  if (!timestamp) return '-'
  const ts = timestamp < 1e12 ? timestamp * 1000 : timestamp
  const d = new Date(ts)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const formatCoord = (lng?: number, lat?: number): string => {
  if (!lng || !lat) return '-'
  return `${Number(lng).toFixed(5)}, ${Number(lat).toFixed(5)}`
}

const findClosestRouteIndex = (pos: RoutePoint, route: RoutePoint[]): number => {
  let min = Number.MAX_VALUE
  let idx = 0
  for (let i = 0; i < route.length; i++) {
    const d = haversineMeters(pos, route[i])
    if (d < min) {
      min = d
      idx = i
    }
  }
  return idx
}

const haversineMeters = (a: RoutePoint, b: RoutePoint): number => {
  const R = 6371000
  const toRad = (v: number) => (v * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

const loadMapConfig = async (): Promise<void> => {
  try {
    const res: any = await request.get('/route/config')
    const data = res?.data || res
    if (data?.coordType === 'wgs84' || data?.coordType === 'bd09' || data?.coordType === 'gcj02') {
      coordType.value = data.coordType
    }
  } catch {
    // ignore
  }
}

onMounted(async () => {
  await loadMapConfig()
  await loadTaskDetail()
  if (detail.value.status === 'pending' && isAdmin.value) {
    await loadAvailableDrones()
  }
  timer = window.setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)
  ws.connect()
})

onBeforeUnmount(() => {
  if (timer) {
    window.clearInterval(timer)
    timer = null
  }
  stopReplay()
  ws.disconnect()
})
</script>

<style scoped lang="scss">
.task-detail {
  padding: 20px;
  background: transparent;
  min-height: calc(100vh - 60px);
}

.info-card,
.progress-card {
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.95) 0%, rgba(8, 18, 36, 0.95) 100%);
  border: 1px solid rgba(86, 211, 255, 0.15);
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
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.92), rgba(8, 18, 36, 0.92));
  border: 1px solid rgba(86, 211, 255, 0.18);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
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
  background: rgba(10, 20, 40, 0.85);
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
  color: #9bb3d3;
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

.trip-badges {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.drone-info-card {
  margin-top: 16px;
  padding: 20px;
  background: linear-gradient(135deg, rgba(8, 17, 34, 0.9) 0%, rgba(12, 26, 52, 0.9) 100%);
  border-radius: 10px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(86, 211, 255, 0.2);
}

.route-info-card {
  margin-top: 16px;
  padding: 16px;
  background: rgba(8, 17, 34, 0.7);
  border-radius: 8px;
  
  .info-value {
    font-weight: 600;
    color: #56d3ff;
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
  color: #e6f0ff;
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
    color: #9bb3d3;
    font-size: 14px;
  }
  
  .value {
    color: #e6f0ff;
    font-weight: 500;
  }
  
  :deep(.el-progress) {
    flex: 1;
  }
}

.replay-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #e6f0ff;
}
.replay-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.replay-timeline {
  margin-top: 8px;
}
.timeline-track {
  position: relative;
  height: 6px;
  background: rgba(86, 211, 255, 0.12);
  border-radius: 999px;
  overflow: hidden;
}
.timeline-progress {
  height: 100%;
  background: linear-gradient(90deg, #56d3ff 0%, #ff4d4f 100%);
}
.timeline-thumb {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ff4d4f;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px rgba(255, 77, 79, 0.6);
}
.timeline-ticks {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  font-size: 10px;
  color: #6f89ab;
}
.timeline-ticks .tick {
  text-align: center;
}
.timeline-labels {
  margin-top: 6px;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #9bb3d3;
}

.trip-summary {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.trip-point {
  display: flex;
  align-items: center;
  gap: 10px;
}
.trip-point .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.trip-point .dot.start {
  background: #52c41a;
  box-shadow: 0 0 6px rgba(82, 196, 26, 0.6);
}
.trip-point .dot.end {
  background: #ff4d4f;
  box-shadow: 0 0 6px rgba(255, 77, 79, 0.6);
}
.trip-point .label {
  width: 40px;
  color: #9bb3d3;
  font-size: 12px;
}
.trip-point .value {
  color: #e6f0ff;
  font-weight: 500;
}
.trip-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.metric {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(86, 211, 255, 0.08);
  border: 1px solid rgba(86, 211, 255, 0.18);
}
.metric-label {
  font-size: 12px;
  color: #9bb3d3;
}
.metric-value {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 600;
  color: #56d3ff;
}
</style>
