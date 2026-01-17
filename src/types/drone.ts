/**
 * 无人机标记点类型定义
 * @author System
 * @date 2025-01
 */
export interface DroneMarker {
  /** 无人机ID */
  id: string | number
  /** 纬度 */
  lat: number
  /** 经度 */
  lng: number
  /** 高度（米） */
  altitude?: number
  /** 标签名称 */
  label?: string
  /** 状态：normal-正常, warning-警告, error-异常, flying-飞行中, idle-空闲 */
  status?: 'normal' | 'warning' | 'error' | 'flying' | 'idle' | 'charging' | 'maintenance'
  /** 电量百分比 */
  batteryLevel?: number
  /** 速度（m/s） */
  speed?: number
  /** 航向角（度） */
  heading?: number
  /** 关联任务ID */
  taskId?: number
  /** 最后更新时间戳 */
  lastUpdateTime?: number
}

/**
 * 无人机实时位置DTO
 */
export interface DronePositionDTO {
  droneId: number
  droneCode: string
  longitude: number
  latitude: number
  altitude?: number
  speed?: number
  batteryLevel: number
  status: string
  heading?: number
  taskId?: number
  lastUpdateTime?: string
}

/**
 * 路径点类型
 */
export interface RoutePoint {
  /** 经度 */
  lng: number
  /** 纬度 */
  lat: number
  /** 高度 */
  altitude?: number
  /** 时间戳 */
  timestamp?: number
}

