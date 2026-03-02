/**
 * 无人机实时位置Hook
 * 支持WebSocket实时推送和HTTP轮询降级
 * @author System
 * @date 2025-01
 */
import { ref, onBeforeUnmount, Ref } from 'vue'
import type { DroneMarker, DronePositionDTO } from '@/types/drone'
import request from '@/utils/request'
import { useWebSocket, WebSocketMessage } from './useWebSocket'

export interface UseLivePositionsOptions {
  /** WebSocket地址，如果提供则使用WebSocket，否则使用HTTP轮询 */
  wsUrl?: string
  /** HTTP轮询间隔（毫秒），默认2000 */
  pollInterval?: number
  /** 是否启用HTTP轮询降级 */
  enablePolling?: boolean
}

/**
 * 无人机实时位置Hook
 */
export function useLivePositions(options: UseLivePositionsOptions = {}) {
  const { wsUrl, pollInterval = 2000, enablePolling = true } = options
  
  const markers: Ref<DroneMarker[]> = ref([])
  const connected = ref(false)
  let pollTimer: number | null = null
  let useWebSocketMode = false

  /**
   * 转换后端DTO为前端Marker格式
   */
  const convertToMarker = (dto: DronePositionDTO): DroneMarker => {
    // 兼容后端字段命名（驼峰/下划线）
    const lng = (dto as any).current_lng ?? (dto as any).currentLng ?? (dto as any).longitude ?? dto.lng ?? (dto as any).lon
    const lat = (dto as any).current_lat ?? (dto as any).currentLat ?? (dto as any).latitude ?? dto.lat
    const battery = (dto as any).battery_level ?? dto.batteryLevel ?? (dto as any).battery
    const droneId = (dto as any).drone_id ?? dto.droneId ?? (dto as any).id
    const droneCode = (dto as any).drone_code ?? dto.droneCode ?? (dto as any).model
    const taskId = (dto as any).task_id ?? dto.taskId
    const altitude = (dto as any).altitude ?? (dto as any).alt ?? (dto as any).current_altitude
    const heading = (dto as any).heading
    const speed = (dto as any).speed ?? (dto as any).max_speed
    const status = (dto as any).status
    const updatedAt = (dto as any).updated_at ?? dto.lastUpdateTime ?? (dto as any).last_check_time

    return {
      id: droneId,
      lat: lat || 0, // Ensure not undefined
      lng: lng || 0, // Ensure not undefined
      altitude: altitude || 0,
      label: droneCode || `DRONE-${droneId}`,
      status: getStatusFromDto(status),
      batteryLevel: battery || 0,
      speed: speed || 0,
      heading: heading || 0,
      taskId,
      lastUpdateTime: updatedAt ? new Date(updatedAt).getTime() : undefined
    }
  }

  /**
   * 转换状态字符串为前端状态类型
   */
  const getStatusFromDto = (status: string): DroneMarker['status'] => {
    const statusMap: Record<string, DroneMarker['status']> = {
      'idle': 'idle',
      'flying': 'flying',
      'in_progress': 'flying',
      'charging': 'charging',
      'maintenance': 'maintenance'
    }
    return statusMap[status] || 'normal'
  }

  /**
   * HTTP轮询获取位置
   */
  const pollPositions = async (): Promise<void> => {
    try {
      // Use /drone/live to get real-time positions
      const res: any = await request.get('/drone/live')
      const data = res?.data || res || []
      const list: any[] = Array.isArray(data) ? data : []
      
      // Update markers
      // Note: /drone/live returns DroneLiveDTO which convertToMarker handles
      // But we might want to merge with existing markers to preserve static info if needed
      // For now, just mapping live data is enough for position updates
      const newMarkers = list.map(convertToMarker)
      
      // Merge logic: if marker exists, update it; if not, add it
      // Actually, if we just replace markers, we might lose selection state or static info if markers contained more
      // But DroneMarker interface is simple.
      // Let's just replace for simplicity, or merge if we want to be fancy.
      // Since this is a list of ALL live drones, replacing is fine.
      markers.value = newMarkers
    } catch (error) {
      console.error('Failed to fetch drone positions:', error)
    }
  }

  /**
   * WebSocket消息处理
   */
  const handleWebSocketMessage = (message: WebSocketMessage): void => {
    const applyUpdates = (updates: DronePositionDTO[]): void => {
      updates.forEach(dto => {
        const marker = convertToMarker(dto)
        const index = markers.value.findIndex(m => m.id === marker.id)
        if (index >= 0) {
          markers.value[index] = { ...markers.value[index], ...marker }
        } else {
          markers.value.push(marker)
        }
      })
    }

    if (message.type === 'drone_position') {
      if (Array.isArray(message.data)) {
        applyUpdates(message.data as DronePositionDTO[])
      } else if (message.data && typeof message.data === 'object') {
        applyUpdates([message.data as DronePositionDTO])
      }
      return
    }
    if (message.type === 'drone_position_batch') {
      const list = Array.isArray(message.data?.list) ? message.data.list : []
      if (list.length > 0) {
        applyUpdates(list as DronePositionDTO[])
      }
      return
    } else if (message.type === 'alert') {
      // 处理告警消息
      console.warn('Drone alert:', message.data)
    }
  }

  /**
   * WebSocket实例引用
   */
  let wsInstance: ReturnType<typeof useWebSocket> | null = null

  /**
   * 使用WebSocket连接
   */
  const connectWebSocket = (): void => {
    if (!wsUrl) {
      if (enablePolling) {
        startPolling()
      }
      return
    }

    useWebSocketMode = true
    wsInstance = useWebSocket({
      url: wsUrl,
      autoReconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 5,
      heartbeatInterval: 30000,
      getToken: () => localStorage.getItem('access_token'),
      onOpen: () => {
        connected.value = true
        console.log('WebSocket connected for drone positions')
        // 初始加载一次数据
        pollPositions()
      },
      onClose: () => {
        connected.value = false
        console.log('WebSocket disconnected, falling back to polling')
        if (enablePolling) {
          startPolling()
        }
      },
      onError: (error) => {
        console.error('WebSocket error:', error)
        connected.value = false
        if (enablePolling) {
          startPolling()
    }
  }
    })

    // 重写handleMessage
    const originalHandleMessage = wsInstance.handleMessage
    wsInstance.handleMessage = (message: WebSocketMessage) => {
      originalHandleMessage(message)
      handleWebSocketMessage(message)
    }
    
    wsInstance.connect()
  }

  /**
   * 开始HTTP轮询
   */
  const startPolling = (): void => {
    if (pollTimer) {
      return
    }
    // 立即执行一次
    pollPositions()
    // 定时轮询
    pollTimer = window.setInterval(() => {
      pollPositions()
    }, pollInterval)
  }

  /**
   * 停止HTTP轮询
   */
  const stopPolling = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  /**
   * 开始监听
   */
  const start = (initial?: DroneMarker[]): void => {
    if (initial && initial.length > 0) {
      markers.value = initial
    }
    
    if (wsUrl) {
      connectWebSocket()
    } else if (enablePolling) {
      startPolling()
    }
  }

  /**
   * 停止监听
   */
  const stop = (): void => {
    stopPolling()
    if (wsInstance) {
      wsInstance.disconnect()
      wsInstance = null
    }
    connected.value = false
  }

  onBeforeUnmount(() => {
    stop()
  })

  return {
    markers,
    connected,
    start,
    stop,
    refresh: pollPositions
  }
}

