/**
 * 路径规划API接口
 * 支持沿道路正上方飞行的路径规划
 * @author System
 * @date 2025-01
 */
import request from '@/utils/request'
import type { RoutePoint } from '@/types/drone'

/**
 * 路径规划选项
 */
export interface RouteOptions {
  /** 是否避开禁飞区 */
  avoidNoFlyZones?: boolean
  /** 是否考虑天气因素 */
  considerWeather?: boolean
  /** 优化策略：shortest-最短路径, safest-最安全路径, fastest-最快路径 */
  optimizeStrategy?: 'shortest' | 'safest' | 'fastest'
  /** 无人机ID（可选，用于计算电量消耗） */
  droneId?: number
}

/**
 * 路径规划请求参数
 */
export interface RouteCalculateRequest {
  /** 起点经度 */
  originLng: number
  /** 起点纬度 */
  originLat: number
  /** 终点经度 */
  destLng: number
  /** 终点纬度 */
  destLat: number
  /** 路径规划选项 */
  options?: RouteOptions
  /** 是否异步计算（返回 jobId） */
  async?: boolean
}

/**
 * 路径规划结果
 */
export interface RouteResult {
  /** 路径ID */
  routeId?: string
  /** 路径距离（公里） */
  distance: number
  distanceKm?: number
  /** 预计时长（秒） */
  duration: number
  durationSeconds?: number
  /** 路径点列表 */
  points: Array<{
    lng: number
    lat: number
    altitude?: number
  }>
  /** 风险系数（0-1） */
  riskFactor?: number
  /** 天气状况 */
  weatherCondition?: string
  /** 预计电量消耗（百分比） */
  estimatedBatteryConsumption?: number
  /** 警告信息列表 */
  warnings?: string[]
}

/**
 * 计算路径规划
 * @param params 路径规划参数
 * @returns 路径规划结果
 */
export async function calculateRoute(params: RouteCalculateRequest): Promise<RouteResult | { jobId: string }> {
  const res: any = await request.post('/route/calculate', params)
  const data = res?.data || res

  // 如果后端返回 jobId（async accepted），直接返回 job info
  if (data && data.jobId) {
    return { jobId: data.jobId }
  }

  // 转换路径点格式
  if (data.points && Array.isArray(data.points)) {
    data.points = data.points.map((p: any) => ({
      lng: p.lng || p.longitude,
      lat: p.lat || p.latitude,
      altitude: p.altitude || 100 // 默认高度100米
    }))
  }
  // 兼容后端字段名 distanceKm/durationSeconds
  data.distance = data.distance ?? data.distanceKm ?? 0
  data.duration = data.duration ?? data.durationSeconds ?? 0

  return data
}

/**
 * 获取路径详情
 * @param routeId 路径ID
 * @returns 路径详情
 */
export async function getRouteDetail(routeId: string): Promise<RouteResult> {
  const res: any = await request.get(`/route/${routeId}`)
  const data = res?.data || res
  
  if (data.points && Array.isArray(data.points)) {
    data.points = data.points.map((p: any) => ({
      lng: p.lng || p.longitude,
      lat: p.lat || p.latitude,
      altitude: p.altitude || 100
    }))
  }
  data.distance = data.distance ?? data.distanceKm ?? 0
  data.duration = data.duration ?? data.durationSeconds ?? 0
  
  return data
}

/**
 * 重新规划路径
 * @param routeId 原路径ID
 * @param options 新的规划选项
 * @returns 新的路径规划结果
 */
export async function recalculateRoute(
  routeId: string,
  options: RouteOptions
): Promise<RouteResult> {
  const res: any = await request.post(`/route/recalculate/${routeId}`, {
    reason: 'user_request',
    options
  })
  const data = res?.data || res
  
  if (data.points && Array.isArray(data.points)) {
    data.points = data.points.map((p: any) => ({
      lng: p.lng || p.longitude,
      lat: p.lat || p.latitude,
      altitude: p.altitude || 100
    }))
  }
  data.distance = data.distance ?? data.distanceKm ?? 0
  data.duration = data.duration ?? data.durationSeconds ?? 0
  
  return data
}

/**
 * 获取禁飞区列表
 * @param params 查询参数
 * @returns 禁飞区列表
 */
export async function getNoFlyZones(params?: {
  lng?: number
  lat?: number
  radius?: number
}): Promise<Array<{
  zoneId: number
  name: string
  type: string
  polygon: Array<{ lng: number; lat: number }>
  maxAltitude: number
}>> {
  const res: any = await request.get('/route/no-fly-zones', { params })
  return res?.data || res || []
}
