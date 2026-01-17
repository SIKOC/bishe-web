/**
 * WebSocket实时通信Hook
 * 支持自动重连、心跳检测、消息订阅
 * @author System
 * @date 2025-01
 */
import { ref, onBeforeUnmount, Ref } from 'vue'
import { ElMessage } from 'element-plus'

export interface WebSocketMessage {
  type: string
  timestamp?: number
  data?: any
  [key: string]: any
}

export interface WebSocketOptions {
  /** WebSocket连接地址 */
  url: string
  /** 是否自动重连 */
  autoReconnect?: boolean
  /** 重连间隔（毫秒） */
  reconnectInterval?: number
  /** 最大重连次数 */
  maxReconnectAttempts?: number
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number
  /** Token获取函数 */
  getToken?: () => string | null
  /** 连接成功回调 */
  onOpen?: () => void
  /** 连接关闭回调 */
  onClose?: () => void
  /** 错误回调 */
  onError?: (error: Event) => void
}

/**
 * WebSocket Hook
 */
export function useWebSocket(options: WebSocketOptions) {
  const {
    url,
    autoReconnect: autoReconnectOption = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000,
    getToken,
    onOpen,
    onClose,
    onError
  } = options

  // 使用可变的自动重连标记，便于断开时关闭重连
  let autoReconnect = autoReconnectOption

  const ws: Ref<WebSocket | null> = ref(null)
  const connected = ref(false)
  const reconnectAttempts = ref(0)
  let heartbeatTimer: number | null = null
  let reconnectTimer: number | null = null

  /**
   * 连接WebSocket
   */
  const connect = (): void => {
    try {
      const token = getToken?.() || localStorage.getItem('access_token')
      const wsUrl = token ? `${url}?token=${token}` : url
      
      ws.value = new WebSocket(wsUrl)

      ws.value.onopen = () => {
        connected.value = true
        reconnectAttempts.value = 0
        startHeartbeat()
        onOpen?.()
      }

      ws.value.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          handleMessage(message)
          
          // 响应心跳
          if (message.type === 'pong') {
            // 心跳响应，无需处理
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error)
        }
      }

      ws.value.onerror = (error: Event) => {
        console.error('WebSocket error:', error)
        onError?.(error)
      }

      ws.value.onclose = () => {
        connected.value = false
        stopHeartbeat()
        onClose?.()
        
        if (autoReconnect && reconnectAttempts.value < maxReconnectAttempts) {
          reconnectAttempts.value++
          reconnectTimer = window.setTimeout(() => {
            connect()
          }, reconnectInterval)
        }
      }
    } catch (error) {
      console.error('WebSocket connect error:', error)
      ElMessage.error('WebSocket连接失败')
    }
  }

  /**
   * 断开连接
   */
  const disconnect = (): void => {
    autoReconnect = false
    stopHeartbeat()
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
  }

  /**
   * 发送消息
   */
  const send = (message: WebSocketMessage): void => {
    if (ws.value && connected.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  /**
   * 订阅任务
   */
  const subscribeTask = (taskId: number): void => {
    send({ type: 'subscribe', taskId })
  }

  /**
   * 取消订阅任务
   */
  const unsubscribeTask = (taskId: number): void => {
    send({ type: 'unsubscribe', taskId })
  }

  /**
   * 开始心跳
   */
  const startHeartbeat = (): void => {
    if (heartbeatInterval > 0) {
      heartbeatTimer = window.setInterval(() => {
        send({ type: 'ping' })
      }, heartbeatInterval)
    }
  }

  /**
   * 停止心跳
   */
  const stopHeartbeat = (): void => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer)
      heartbeatTimer = null
    }
  }

  /**
   * 处理消息（子类可重写）
   */
  const handleMessage = (message: WebSocketMessage): void => {
    // 默认处理，子类可重写
    console.log('WebSocket message:', message)
  }

  onBeforeUnmount(() => {
    disconnect()
  })

  return {
    ws,
    connected,
    connect,
    disconnect,
    send,
    subscribeTask,
    unsubscribeTask,
    handleMessage
  }
}

