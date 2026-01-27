<template>
  <div class="monitor-screen">
    <!-- 顶部统计栏 -->
    <div class="top-bar">
      <div class="stat-item">
        <span class="label">在线无人机</span>
        <span class="value online">{{ drones.length }}</span>
      </div>
      <div class="stat-item">
        <span class="label">飞行中</span>
        <span class="value flying">{{ flyingCount }}</span>
      </div>
      <div class="stat-item">
        <span class="label">异常告警</span>
        <span class="value alert" :class="{ 'has-alert': alerts.length > 0 }">{{ alerts.length }}</span>
      </div>
      <div class="stat-item">
        <span class="label">连接状态</span>
        <span class="value" :class="{ 'connected': connected, 'disconnected': !connected }">
          <el-icon><CircleCheck v-if="connected" /><CircleClose v-else /></el-icon>
          {{ connected ? '已连接' : '已断开' }}
        </span>
      </div>
    </div>

    <div class="content-wrapper">
      <!-- 左侧无人机列表 -->
      <div class="left-panel">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>在线无人机</span>
              <el-button size="small" text @click="refreshDrones">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <el-scrollbar height="calc(100vh - 200px)">
            <div v-if="drones.length === 0" class="empty-state">
              <el-empty description="暂无在线无人机" :image-size="80" />
            </div>
            <div
              v-for="d in drones"
              :key="d.id"
              class="drone-item"
              :class="{ 'active': selectedDroneId === d.id }"
              @click="selectDrone(d)"
            >
              <div class="drone-header">
                <div class="drone-status">
                  <div class="status-dot" :style="{ backgroundColor: getStatusColor(d.status) }"></div>
                  <span class="drone-name">{{ d.label }}</span>
                </div>
                <el-tag :type="getStatusTagType(d.status)" size="small">{{ getStatusText(d.status) }}</el-tag>
              </div>
              <div class="drone-info">
                <div class="info-row">
                  <span class="info-label">电量:</span>
                  <el-progress
                    :percentage="d.batteryLevel || 0"
                    :color="getBatteryColor(d.batteryLevel)"
                    :stroke-width="6"
                    :show-text="false"
                    style="flex: 1; margin: 0 8px;"
                  />
                  <span class="info-value" :style="{ color: getBatteryColor(d.batteryLevel) }">
                    {{ d.batteryLevel?.toFixed(1) || 0 }}%
                  </span>
                </div>
                <div class="info-row" v-if="d.speed !== undefined">
                  <span class="info-label">速度:</span>
                  <span class="info-value">{{ d.speed.toFixed(1) }} m/s</span>
                </div>
                <div class="info-row" v-if="d.altitude !== undefined">
                  <span class="info-label">高度:</span>
                  <span class="info-value">{{ d.altitude.toFixed(1) }} m</span>
                </div>
                <div class="info-row" v-if="d.taskId">
                  <span class="info-label">任务:</span>
                  <span class="info-value">#{{ d.taskId }}</span>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </el-card>
      </div>

      <!-- 中间地图区域 -->
      <div class="center-panel">
        <!-- 地图控制面板 -->
        <div class="map-controls">
          <el-card shadow="hover" class="control-card">
            <div class="control-content">
              <el-switch
                v-model="showRoutes"
                active-text="显示路径"
                inactive-text="隐藏路径"
                size="small"
              />
              <el-button
                v-if="selectedDroneId"
                size="small"
                text
                @click="clearSelection"
              >
                <el-icon><Close /></el-icon>
                清除选择
              </el-button>
              <el-button
                size="small"
                text
                @click="showAllDrones"
              >
                <el-icon><FullScreen /></el-icon>
                显示全部
              </el-button>
            </div>
          </el-card>
        </div>
        
        <MapContainer
          :markers="markers"
          :route="showRoutes ? selectedRoute : []"
          :show-toolbar="true"
          @marker-click="handleMarkerClick"
          ref="mapRef"
        />
      </div>

      <!-- 右侧告警列表 -->
      <div class="right-panel">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span>实时告警</span>
              <el-badge :value="alerts.length" :hidden="alerts.length === 0">
                <el-button size="small" text @click="clearAlerts">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-badge>
            </div>
          </template>
          <el-scrollbar height="calc(100vh - 200px)">
            <div v-if="alerts.length === 0" class="empty-state">
              <el-empty description="暂无告警" :image-size="80" />
            </div>
            <el-timeline v-else>
              <el-timeline-item
                v-for="(alert, index) in alerts"
                :key="index"
                :timestamp="formatTime(alert.timestamp)"
                :type="getAlertType(alert.level)"
                placement="top"
              >
                <div class="alert-content">
                  <div class="alert-title">{{ alert.data.droneCode || '系统' }}</div>
                  <div class="alert-message">{{ alert.data.message }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-scrollbar>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 实时监控指挥页面
 * 显示所有无人机实时位置、状态、告警信息
 * @author System
 * @date 2025-01
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheck, CircleClose, Refresh, Delete, FullScreen, Close } from '@element-plus/icons-vue'
import MapContainer from '@/components/MapContainer.vue'
import { useLivePositions } from '@/hooks/useLivePositions'
import request from '@/utils/request'
import type { DroneMarker, RoutePoint } from '@/types/drone'

interface Alert {
  timestamp: number
  level: 'info' | 'warning' | 'error'
  data: {
    droneId?: number
    droneCode?: string
    alertType?: string
    message: string
    [key: string]: any
  }
}

const drones = ref<DroneMarker[]>([])
const selectedDroneId = ref<number | string | null>(null)
const selectedRoute = ref<RoutePoint[]>([])
const alerts = ref<Alert[]>([])
const connected = ref(false)
const showRoutes = ref(true)
const mapRef = ref<any>(null)
const droneRoutes = ref<Map<number | string, RoutePoint[]>>(new Map())

// 获取WebSocket地址（从环境变量或配置）
const wsUrl = computed(() => {
  const baseUrl = import.meta.env.VITE_NETTY_WS_BASE || 'ws://localhost:18080'
  return `${baseUrl}/ws`
})

// 使用实时位置Hook
const { markers, connected: wsConnected, start, stop, refresh } = useLivePositions({
  wsUrl: wsUrl.value,
  enablePolling: true,
  pollInterval: 2000
})

// 计算属性
const flyingCount = computed(() => {
  return drones.value.filter(d => d.status === 'flying').length
})

// 监听markers变化，更新drones列表
watch(markers, (newMarkers) => {
  drones.value = newMarkers
  // 检查告警条件
  checkAlerts(newMarkers)
  // 自动加载飞行中无人机的路径
  if (showRoutes.value) {
    newMarkers.forEach(drone => {
      if (drone.status === 'flying' && drone.taskId && !droneRoutes.value.has(drone.id)) {
        loadDroneRoute(drone.taskId, drone.id)
      }
    })
  }
}, { deep: true })

// 监听显示路径开关
watch(showRoutes, (show) => {
  if (!show) {
    selectedRoute.value = []
  } else if (selectedDroneId.value) {
    const route = droneRoutes.value.get(selectedDroneId.value)
    if (route) {
      selectedRoute.value = route
    }
  }
})

/**
 * 检查告警条件
 */
const checkAlerts = (droneList: DroneMarker[]): void => {
  droneList.forEach(drone => {
    // 电量告警
    if (drone.batteryLevel !== undefined && drone.batteryLevel < 20) {
      const existingAlert = alerts.value.find(
        a => a.data.droneId === drone.id && a.data.alertType === 'low_battery'
      )
      if (!existingAlert) {
        alerts.value.unshift({
          timestamp: Date.now(),
          level: drone.batteryLevel < 10 ? 'error' : 'warning',
          data: {
            droneId: drone.id as number,
            droneCode: drone.label,
            alertType: 'low_battery',
            message: `电量${drone.batteryLevel < 10 ? '严重不足' : '不足'} (${drone.batteryLevel.toFixed(1)}%)`
          }
        })
      }
    }
    
    // 异常状态告警
    if (drone.status === 'error' || drone.status === 'maintenance') {
      const existingAlert = alerts.value.find(
        a => a.data.droneId === drone.id && a.data.alertType === 'status_error'
      )
      if (!existingAlert) {
        alerts.value.unshift({
          timestamp: Date.now(),
          level: 'error',
          data: {
            droneId: drone.id as number,
            droneCode: drone.label,
            alertType: 'status_error',
            message: `无人机状态异常: ${getStatusText(drone.status)}`
          }
        })
      }
    }
  })
  
  // 限制告警数量
  if (alerts.value.length > 50) {
    alerts.value = alerts.value.slice(0, 50)
  }
}

/**
 * 选择无人机
 */
const selectDrone = (drone: DroneMarker): void => {
  selectedDroneId.value = drone.id
  // 加载该无人机的路径信息
  if (drone.taskId) {
    loadDroneRoute(drone.taskId, drone.id)
  } else {
    selectedRoute.value = []
  }
}

/**
 * 加载无人机路径
 */
const loadDroneRoute = async (taskId: number, droneId: number | string): Promise<void> => {
  try {
    const res: any = await request.get(`/task/tasks/${taskId}/track`)
    const data = res?.data || res
    if (data.route && data.route.length > 0) {
      const route = data.route.map((p: any) => ({
        lng: p.lng,
        lat: p.lat,
        altitude: p.altitude,
        timestamp: p.timestamp
      }))
      selectedRoute.value = route
      droneRoutes.value.set(droneId, route)
    }
  } catch (error) {
    console.error('Failed to load route:', error)
    selectedRoute.value = []
  }
}

/**
 * 显示所有无人机
 */
const showAllDrones = (): void => {
  if (mapRef.value && mapRef.value.resetView) {
    mapRef.value.resetView()
  }
  selectedDroneId.value = null
  selectedRoute.value = []
}

/**
 * 清除选择
 */
const clearSelection = (): void => {
  selectedDroneId.value = null
  selectedRoute.value = []
}

/**
 * 处理标记点击
 */
const handleMarkerClick = (marker: DroneMarker): void => {
  selectDrone(marker)
}

/**
 * 刷新无人机列表
 */
const refreshDrones = (): void => {
  refresh()
  ElMessage.success('已刷新')
}

/**
 * 清空告警
 */
const clearAlerts = (): void => {
  alerts.value = []
  ElMessage.success('已清空告警')
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status?: string): string => {
  const colorMap: Record<string, string> = {
    'normal': '#52c41a',
    'flying': '#1890ff',
    'idle': '#d9d9d9',
    'warning': '#faad14',
    'error': '#ff4d4f',
    'charging': '#722ed1',
    'maintenance': '#eb2f96'
  }
  return colorMap[status || 'normal'] || '#52c41a'
}

/**
 * 获取状态文本
 */
const getStatusText = (status?: string): string => {
  const textMap: Record<string, string> = {
    'normal': '正常',
    'flying': '飞行中',
    'idle': '空闲',
    'warning': '警告',
    'error': '异常',
    'charging': '充电中',
    'maintenance': '维护中'
  }
  return textMap[status || 'normal'] || '未知'
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status?: string): string => {
  const typeMap: Record<string, string> = {
    'normal': 'success',
    'flying': 'primary',
    'idle': 'info',
    'warning': 'warning',
    'error': 'danger',
    'charging': '',
    'maintenance': 'warning'
  }
  return typeMap[status || 'normal'] || ''
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
 * 获取告警类型
 */
const getAlertType = (level: string): string => {
  const typeMap: Record<string, string> = {
    'info': 'primary',
    'warning': 'warning',
    'error': 'danger'
  }
  return typeMap[level] || 'info'
}

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`
}

onMounted(() => {
  start()
})

watch(wsConnected, (value) => {
  connected.value = value
})

onBeforeUnmount(() => {
  stop()
})
</script>

<style scoped lang="scss">
.monitor-screen {
  height: calc(100vh - 60px);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 48px;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 12px;
  min-width: 100px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.8);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .label {
    font-size: 13px;
    color: #666;
    font-weight: 500;
  }
  
  .value {
    font-size: 24px;
    font-weight: 700;
    color: #333;
    display: flex;
    align-items: center;
    gap: 6px;
    
    &.online {
      color: #1890ff;
    }
    
    &.flying {
      color: #52c41a;
    }
    
    &.alert {
      color: #999;
      
      &.has-alert {
        color: #ff4d4f;
        animation: pulse 2s infinite;
      }
    }
    
    &.connected {
      color: #52c41a;
    }
    
    &.disconnected {
      color: #ff4d4f;
    }
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.content-wrapper {
  flex: 1;
  display: flex;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.3);
}

.left-panel,
.right-panel {
  width: 340px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.center-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  position: relative;
}

.map-controls {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 100;
}

.control-card {
  width: 180px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.control-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}

.drone-item {
  padding: 16px;
  margin-bottom: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  &:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    transform: translateY(-4px);
    border-color: rgba(24, 144, 255, 0.3);
  }
  
  &.active {
    border-color: #1890ff;
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
    box-shadow: 0 4px 16px rgba(24, 144, 255, 0.2);
  }
}

.drone-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.drone-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  box-shadow: 0 0 4px currentColor;
}

.drone-name {
  font-weight: 600;
  color: #333;
  font-size: 14px;
}

.drone-info {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.info-row {
  display: flex;
  align-items: center;
  font-size: 13px;
  gap: 8px;
}

.info-label {
  color: #666;
  width: 50px;
  font-weight: 500;
}

.info-value {
  color: #333;
  font-weight: 600;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.alert-content {
  .alert-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }
  
  .alert-message {
    font-size: 12px;
    color: #666;
  }
}
</style>
