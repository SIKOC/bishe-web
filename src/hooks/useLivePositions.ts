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
  let pollTimer: number | null = null
  let useWebSocketMode = false

  /**
   * 转换后端DTO为前端Marker格式
   */
  const convertToMarker = (dto: DronePositionDTO): DroneMarker => {
    // 兼容后端字段命名（驼峰/下划线）
    const lng = (dto as any).longitude ?? dto.lng ?? (dto as any).lon
    const lat = (dto as any).latitude ?? dto.lat
    const battery = (dto as any).battery_level ?? dto.batteryLevel
    const droneId = (dto as any).drone_id ?? dto.droneId
    const droneCode = (dto as any).drone_code ?? dto.droneCode
    const taskId = (dto as any).task_id ?? dto.taskId
    const altitude = (dto as any).altitude ?? (dto as any).alt
    const heading = (dto as any).heading
    const speed = (dto as any).speed
    const status = (dto as any).status
    const updatedAt = (dto as any).updated_at ?? dto.lastUpdateTime

    return {
      id: droneId,
      lat,
      lng,
      altitude,
      label: droneCode,
      status: getStatusFromDto(status),
      batteryLevel: battery,
      speed,
      heading,
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
      const res = await request.get('/monitor/live').catch(() => request.get('/drone/live'))
      const data = res?.data || res || []
      const list: DronePositionDTO[] = Array.isArray(data) ? data : []
      
      markers.value = list.map(convertToMarker)
    } catch (error) {
      console.error('Failed to fetch drone positions:', error)
    }
  }

  /**
   * WebSocket消息处理
   */
  const handleWebSocketMessage = (message: WebSocketMessage): void => {
    if (message.type === 'drone_position' && Array.isArray(message.data)) {
      // 批量更新位置
      const updates = message.data as DronePositionDTO[]
      updates.forEach(dto => {
        const marker = convertToMarker(dto)
        const index = markers.value.findIndex(m => m.id === marker.id)
        if (index >= 0) {
          markers.value[index] = { ...markers.value[index], ...marker }
        } else {
          markers.value.push(marker)
        }
      })
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
        console.log('WebSocket connected for drone positions')
        // 初始加载一次数据
        pollPositions()
      },
      onClose: () => {
        console.log('WebSocket disconnected, falling back to polling')
        if (enablePolling) {
          startPolling()
        }
      },
      onError: (error) => {
        console.error('WebSocket error:', error)
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
  }

  onBeforeUnmount(() => {
    stop()
  })

  return {
    markers,
    start,
    stop,
    refresh: pollPositions
  }
}

