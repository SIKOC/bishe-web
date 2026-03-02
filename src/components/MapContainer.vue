<template>
  <div class="map-container">
    <div
      class="map-wrapper"
      v-loading="loading"
      element-loading-text="地图加载中..."
      element-loading-background="rgba(0,0,0,0)"
    >
      <div :id="containerId" class="map"></div>
      <div v-if="error" class="error-mask">
        <el-result icon="error" title="地图加载失败" :sub-title="error">
          <template #extra>
            <el-button type="primary" @click="retry">重试</el-button>
          </template>
        </el-result>
      </div>
    </div>
    <!-- 工具栏放在 v-loading 外部，避免被 loading 遮罩挡住无法点击 -->
    <div class="map-toolbar" v-if="showToolbar">
      <el-button-group>
        <el-button size="small" @click.stop.prevent="zoomIn" type="primary" plain>
          <el-icon><Plus /></el-icon>
        </el-button>
        <el-button size="small" @click.stop.prevent="zoomOut" type="primary" plain>
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-button size="small" @click.stop.prevent="resetView" type="primary" plain>
          <el-icon><Refresh /></el-icon>
        </el-button>
      </el-button-group>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 地图容器组件
 * 支持高德地图，显示无人机位置、路径规划、实时轨迹
 * @author System
 * @date 2025-01
 */
import {
  defineProps,
  defineEmits,
  onMounted,
  onBeforeUnmount,
  watch,
  shallowRef,
  ref,
  computed,
  nextTick,
} from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import request from '@/utils/request'
import { Plus, Minus, Refresh } from '@element-plus/icons-vue'
import type { DroneMarker, RoutePoint } from '@/types/drone'

interface Props {
  /** 标记点列表 */
  markers?: DroneMarker[]
  /** 地图中心点 */
  center?: { lng: number; lat: number }
  /** 路径点列表 */
  route?: RoutePoint[]
  /** 坐标系类型：gcj02 | wgs84 | bd09 */
  coordType?: 'gcj02' | 'wgs84' | 'bd09'
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 初始缩放级别 */
  zoom?: number
  /** 是否显示实时轨迹 */
  showTrack?: boolean
  /** 是否自动适配视野到标记/路径 */
  autoFit?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  markers: () => [],
  coordType: 'wgs84',
  showToolbar: true,
  zoom: 11,
  showTrack: false,
  autoFit: true,
})

// 监听器锁：防止 markers/route 变化时重复触发 update
let isUpdating = false
let updateTimer: any = null

const isDebug = () => {
  try {
    return (import.meta as any)?.env?.VITE_MAP_DEBUG === '1' || (window as any).__MAP_DEBUG === true
  } catch {
    return false
  }
}

let dbgUpdateCount = 0
let dbgFitCount = 0
let dbgLastUpdate: any = null
let dbgLastFit: any = null
let userInteracted = false

const dbg = (type: string, payload: any) => {
  if (!isDebug()) return
  try {
    console.debug(`[MapContainer][${type}]`, payload)
  } catch {}
}

const markersKey = computed(() => {
  const ms = props.markers || []
  if (!Array.isArray(ms) || ms.length === 0) return ''
  return ms
    .map((m: any) => {
      const id = String(m?.id ?? '')
      const lng = Number(m?.lng)
      const lat = Number(m?.lat)
      const lngS = Number.isFinite(lng) ? lng.toFixed(6) : 'x'
      const latS = Number.isFinite(lat) ? lat.toFixed(6) : 'x'
      const label = String(m?.label ?? '')
      return `${id}:${lngS},${latS}:${label}`
    })
    .join('|')
})

const routeKey = computed(() => {
  const r = props.route || []
  if (!Array.isArray(r) || r.length === 0) return ''
  const first = normalizePoint(r[0])
  const mid = normalizePoint(r[Math.floor(r.length / 2)])
  const last = normalizePoint(r[r.length - 1])
  const fmt = (p: any) =>
    p && Number.isFinite(p.lng) && Number.isFinite(p.lat) ? `${p.lng.toFixed(6)},${p.lat.toFixed(6)}` : 'x'
  return `${r.length}|${fmt(first)}|${fmt(mid)}|${fmt(last)}`
})

const safeUpdate = (force = false, reason = 'unknown') => {
  if (isUpdating && !force) return
  isUpdating = true
  if (updateTimer) clearTimeout(updateTimer)
  if (force) userInteracted = false
  
  updateTimer = setTimeout(() => {
    if (!map.value) {
      isUpdating = false
      return
    }
    dbgUpdateCount++
    dbgLastUpdate = { time: Date.now(), force, reason, markersKey: markersKey.value, routeKey: routeKey.value }
    dbg('update', dbgLastUpdate)
    ensureInteractive()
    updateMarkers(force)
    void updateRoute(force)
    isUpdating = false
  }, 100)
}

const emit = defineEmits<{
  'map-click': [point: { lng: number; lat: number }]
  located: [point: { lng: number; lat: number; address?: string }]
  'marker-click': [marker: DroneMarker]
  'locate-error': [message: string]
  'locate-progress': [message: string]
}>()

const ensureInteractive = () => {
  try {
    if (!map.value) return
    map.value.setStatus({
      dragEnable: true,
      zoomEnable: true,
      doubleClickZoom: true,
      scrollWheel: true,
      keyboardEnable: true,
      touchZoom: true,
      resizeEnable: true,
    })
  } catch {}
}

const lockAutoFit = (ms = 1500) => {
  // autoFitLockUntil = Date.now() + ms
}

const enableAutoFit = () => {
  // no-op
}

const canAutoFit = () => true

const onUserInteraction = () => {
  // 不做任何锁定，只确保交互开启
  ensureInteractive()
}

const containerId = `amap-${Math.random().toString(36).substr(2, 9)}`
const map = shallowRef<any>(null)
const mapReady = ref(false)
const driving = shallowRef<any>(null)
const polyline = shallowRef<any>(null)
const markerMap = new Map<string | number, any>()
const trackPolyline = shallowRef<any>(null)
const replayPolyline = shallowRef<any>(null)
const geocoder = shallowRef<any>(null)
const loading = ref(true)
const error = ref('')
let routeRenderSeq = 0

let AMAP_KEY = ''
let AMAP_SECURITY_CODE = ''
const FALLBACK_AMAP_KEY = 'bcf90d031736c84e396e0d6732c01cae'
const FALLBACK_AMAP_SECURITY = 'a2bd6dc7e8ed3d039ff6105cbf9147d9'

/**
 * 初始化地图
 */
const initMap = (): void => {
  loading.value = true
  error.value = ''
  mapReady.value = false

  const envKey = import.meta.env.VITE_AMAP_KEY
  const envSecurity = import.meta.env.VITE_AMAP_SECURITY

  // 优先使用前端环境变量配置，便于本地调试
  const loadConfig = envKey
    ? Promise.resolve({ key: envKey, security: envSecurity })
    : request
        .get('/route/config')
        .then((cfg: any) => {
          const data = cfg?.data || cfg
          AMAP_KEY = data?.key || ''
          AMAP_SECURITY_CODE = data?.securityJsCode || ''
          return { key: AMAP_KEY, security: AMAP_SECURITY_CODE }
        })
        .catch(() => {
          return { key: '', security: '' }
        })

  loadConfig
    .then((config) => {
      if (!config.key) {
        config.key = FALLBACK_AMAP_KEY
        config.security = FALLBACK_AMAP_SECURITY
      }
      if (!config.key) {
        throw new Error('地图Key未配置或获取失败，请配置 VITE_AMAP_KEY / 后端 amap.key')
      }

      // 设置安全密钥
      ;(window as any)._AMapSecurityConfig = {
        securityJsCode: config.security || '',
      }

      return AMapLoader.load({
        key: config.key,
        version: '2.0',
        plugins: [
          'AMap.Marker',
          'AMap.Driving',
          'AMap.Geolocation',
          'AMap.Geocoder',
          'AMap.CitySearch',
          'AMap.Autocomplete',
          'AMap.ToolBar',
          'AMap.Scale',
          'AMap.Polyline',
          'AMap.InfoWindow',
        ],
      })
    })
    .then((AMap) => {
      if (!(window as any).AMap) {
        ;(window as any).AMap = AMap
      }
      loading.value = false
      error.value = ''

      const centerPoint = props.center
        ? (() => {
            const normalized = normalizePoint(props.center as RoutePoint)
            if (normalized && isValidLngLat(normalized.lng, normalized.lat)) {
              return [normalized.lng, normalized.lat]
            }
            return [121.4737, 31.2304]
          })()
        : [121.4737, 31.2304]

      // 创建地图实例
      map.value = new AMap.Map(containerId, {
        viewMode: '2D',
        zoom: props.zoom,
        center: centerPoint,
        mapStyle: 'amap://styles/normal',
        showLabel: true,
        features: ['bg', 'road', 'point', 'building'],
        zooms: [3, 20],
        resizeEnable: true,
        dragEnable: true,
        zoomEnable: true,
        doubleClickZoom: true,
        scrollWheel: true,
        keyboardEnable: true,
        touchZoom: true,
        touchZoomCenter: 1,
      })

      // 强制所有交互开关为开启
      ensureInteractive()

      map.value.on('dragstart', () => {
        onUserInteraction()
        userInteracted = true
        dbg('event', { type: 'dragstart', time: Date.now() })
      })
      map.value.on('zoomstart', () => {
        onUserInteraction()
        userInteracted = true
        dbg('event', { type: 'zoomstart', time: Date.now() })
      })
      map.value.on('mousewheel', () => {
        onUserInteraction()
        userInteracted = true
        dbg('event', { type: 'mousewheel', time: Date.now() })
      })
      map.value.on('touchstart', () => {
        onUserInteraction()
        userInteracted = true
        dbg('event', { type: 'touchstart', time: Date.now() })
      })
      map.value.on('moveend', () => {
        dbg('event', { type: 'moveend', time: Date.now() })
      })

      // 兜底添加基础底图层，防止样式/容器问题导致空白
      try {
        const baseLayer = new AMap.TileLayer()
        map.value.add(baseLayer)
      } catch {}

      // 等待地图加载完成
      map.value.on('complete', () => {
        mapReady.value = true
        map.value?.resize()
        ensureInteractive()
        safeUpdate(true, 'map.complete')
        if (!props.center && !props.route?.length && (!props.markers || props.markers.length === 0)) {
          locateNow()
        }
      })

      // 地图点击事件
      map.value.on('click', (e: any) => {
        let lng = e.lnglat.getLng()
        let lat = e.lnglat.getLat()
        if (props.coordType === 'wgs84') {
          const wgs = gcj02ToWgs84(lng, lat)
          lng = wgs.lng
          lat = wgs.lat
        }
        emit('map-click', { lng, lat })
      })

      // 初始化路径规划插件（不显示在地图上）
      driving.value = new AMap.Driving({
        map: null, // 不显示在地图上
        policy: AMap.DrivingPolicy.LEAST_TIME,
        hideMarkers: true,
      })

      // 使用自定义工具栏替代高德内置 ToolBar，避免冲突；保留比例尺
      const scale = new AMap.Scale({
        position: 'LB',
        offset: new AMap.Pixel(10, 10),
      })
      map.value.addControl(scale)

      // 初始化地理编码器（用于精确地址）
      try {
        geocoder.value = new AMap.Geocoder({
          radius: 200,
          extensions: 'all',
        })
      } catch {
        geocoder.value = null
      }

      // 初始定位逻辑已由 locateNow 统一处理
    })
    .catch((e) => {
      console.error('AMap load failed:', e)
      loading.value = false
      error.value = `地图加载失败: ${e.message || '请检查网络连接或联系管理员'}`
    })
    .catch((err: any) => {
      loading.value = false
      error.value = err?.message || '地图加载失败，请检查 Key/安全密钥配置'
    })
}

/**
 * 更新标记点
 */
const getFallbackMarkers = (): DroneMarker[] => {
  if (!props.route || props.route.length < 2) return []
  const start = normalizePoint(props.route[0] as any)
  const end = normalizePoint(props.route[props.route.length - 1] as any)
  if (!start || !end) return []
  return [
    { id: 'route-origin', lng: start.lng, lat: start.lat, label: '起点', status: 'normal' },
    { id: 'route-dest', lng: end.lng, lat: end.lat, label: '终点', status: 'warning' },
  ]
}

const updateMarkers = (force = false): void => {
  if (!map.value || !(window as any).AMap) {
    return
  }

  try {
    const AMap = (window as any).AMap
    const currentIds = new Set<string | number>()
    const markerSource =
      props.markers && props.markers.length > 0 ? props.markers : getFallbackMarkers()
    
    // 强制交互检查
    ensureInteractive()

    markerSource.forEach((m) => {
      // 防御：确保传入的经纬为数值
      const normalized = normalizePoint({ lng: (m as any).lng, lat: (m as any).lat })
      if (!normalized || !isValidLngLat(normalized.lng, normalized.lat)) {
        console.debug('skip invalid marker', m)
        return
      }
      currentIds.add(m.id)

      try {
        if (markerMap.has(m.id)) {
          const marker = markerMap.get(m.id)
          marker.setPosition([normalized.lng, normalized.lat])
          const infoContent = createInfoWindowContent(m)
          marker.setContent(infoContent)
        } else {
          const infoContent = createInfoWindowContent(m)
          const marker = new AMap.Marker({
            position: [normalized.lng, normalized.lat],
            content: infoContent,
            offset: new AMap.Pixel(0, 0),
            anchor: 'center',
            zIndex: 100,
            animation: 'AMAP_ANIMATION_DROP',
          })

          marker.on('click', () => {
            emit('marker-click', m)
          })

          marker.setMap(map.value)
          markerMap.set(m.id, marker)
        }
      } catch (e) {
        console.warn('marker update failed for', m, e)
      }
    })

    // 移除不存在的标记
    markerMap.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        try {
          marker.setMap(null)
        } catch (e) {
          console.warn('remove marker failed for id', id, e)
        }
        markerMap.delete(id)
      }
    })

    // 如果有标记，自动调整视野（防护）
    if (markerSource.length > 0) {
      const points: number[][] = []
      markerSource.forEach((m) => {
        const normalized = normalizePoint({ lng: (m as any).lng, lat: (m as any).lat })
        if (!normalized || !isValidLngLat(normalized.lng, normalized.lat)) return
        points.push([normalized.lng, normalized.lat])
      })
      // 如果 markers 数量 >= 2，或者强制更新，则适配视野
      if (points.length >= 2 || force) {
        try {
          safeSetBounds(points, [50, 50, 50, 50], undefined, force)
        } catch (e) {
          console.warn('safeSetBounds failed:', e)
        }
      }
    }
    ensureInteractive()
  } catch (err) {
    console.warn('updateMarkers failed:', err, props.markers)
  }
}

/**
 * 创建信息窗口内容
 */
const createInfoWindowContent = (marker: DroneMarker): string => {
  const statusColor = getStatusColor(marker.status)
  
  // 使用紧凑的HTML字符串，避免解析问题
  return `<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:2px;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,0.3);width:36px;height:36px;display:flex;align-items:center;justify-content:center;"><div style="background:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;position:relative;"><div style="width:20px;height:20px;border-radius:50%;background:${statusColor};border:2px solid white;box-shadow:0 0 8px ${statusColor};"></div></div></div>`
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status?: string): string => {
  const colorMap: Record<string, string> = {
    normal: '#52c41a',
    flying: '#1890ff',
    idle: '#d9d9d9',
    warning: '#faad14',
    error: '#ff4d4f',
    charging: '#722ed1',
    maintenance: '#eb2f96',
  }
  return colorMap[status || 'normal'] || '#52c41a'
}

/**
 * 获取状态文本
 */
const getStatusText = (status?: string): string => {
  const textMap: Record<string, string> = {
    normal: '正常',
    flying: '飞行中',
    idle: '空闲',
    warning: '警告',
    error: '异常',
    charging: '充电中',
    maintenance: '维护中',
  }
  return textMap[status || 'normal'] || '未知'
}

/**
 * 获取标记图标（简化版，使用HTML）
 */
const getMarkerIcon = (status?: string, batteryLevel?: number): string => {
  // 返回空字符串，使用HTML内容
  return ''
}

/**
 * 更新路径（沿道路正上方飞行路径）
 */
const updateRoute = async (force = false): Promise<void> => {
  if (!map.value || !(window as any).AMap) return

  const AMap = (window as any).AMap
  ensureInteractive()

  const normalizeDrivingPath = (raw: any): number[][] => {
    if (!Array.isArray(raw)) return []
    return raw
      .map((p: any) => {
        const lng = typeof p?.getLng === 'function' ? p.getLng() : p?.lng
        const lat = typeof p?.getLat === 'function' ? p.getLat() : p?.lat
        return [Number(lng), Number(lat)]
      })
      .filter((p: any) => isValidLngLat(p?.[0], p?.[1]))
  }

  // 1. 无路径时：尝试从 markers 提取起终点，并在前端进行 Driving 规划
  if (!props.route || props.route.length === 0) {
    const originMarker = props.markers?.find((m: any) => String(m.id) === 'origin')
    const destMarker = props.markers?.find((m: any) => String(m.id) === 'dest')
    const origin = originMarker ? normalizePoint({ lng: originMarker.lng, lat: originMarker.lat }) : null
    const dest = destMarker ? normalizePoint({ lng: destMarker.lng, lat: destMarker.lat }) : null
    
    if (origin && dest && isValidLngLat(origin.lng, origin.lat) && isValidLngLat(dest.lng, dest.lat)) {
      // 移除旧线
      if (polyline.value) {
        map.value.remove(polyline.value)
        polyline.value = null
      }
      
      // 前端发起路径规划
      if (driving.value) {
        driving.value.search(
          new AMap.LngLat(origin.lng, origin.lat),
          new AMap.LngLat(dest.lng, dest.lat),
          (status: string, result: any) => {
            if (status === 'complete' && result.routes && result.routes.length) {
              const roadPath = normalizeDrivingPath(result.routes?.[0]?.path)
              if (roadPath.length >= 2) {
                drawPolyline(roadPath, AMap, force, false)
              } else {
                drawStraightLine(origin, dest, AMap, force)
              }
            } else {
              // 失败降级为直线
              drawStraightLine(origin, dest, AMap, force)
            }
          }
        )
      } else {
         drawStraightLine(origin, dest, AMap, force)
      }
      return
    }
    if (polyline.value) {
      map.value.remove(polyline.value)
      polyline.value = null
    }
    return
  }

  const normalizedRoute = props.route
    .map((p) => normalizePoint(p))
    .filter((p): p is RoutePoint => !!p && isValidLngLat(p.lng, p.lat))
  const rawPath = normalizedRoute.map((p) => [p.lng, p.lat])
  const path = downsamplePath(rawPath, 5)

  // 2. 路径点过少（可能是直线插值）：尝试前端 Driving 优化
  if (path.length < 5 && props.route.length >= 2) {
      const origin = normalizePoint(props.route[0])
      const dest = normalizePoint(props.route[props.route.length - 1])
      if (origin && dest && driving.value) {
           driving.value.search(
            new AMap.LngLat(origin.lng, origin.lat),
            new AMap.LngLat(dest.lng, dest.lat),
            (status: string, result: any) => {
                if (status === 'complete' && result.routes && result.routes.length) {
                    const roadPath = normalizeDrivingPath(result.routes?.[0]?.path)
                    drawPolyline(roadPath.length >= 2 ? roadPath : path, AMap, force)
                } else {
                    drawPolyline(path, AMap, force)
                }
            }
           )
           return
      }
  }

  // 3. 正常绘制后端返回的路径
  drawPolyline(path, AMap, force)
}

const drawStraightLine = (origin: any, dest: any, AMap: any, force: boolean) => {
    const fallbackPath = [[origin.lng, origin.lat], [dest.lng, dest.lat]]
    drawPolyline(fallbackPath, AMap, force, true)
}

const drawPolyline = (path: any[], AMap: any, force: boolean, isDashed = false) => {
  if (polyline.value) {
    map.value.remove(polyline.value)
    polyline.value = null
  }
  
  const safePath: number[][] = (Array.isArray(path) ? path : [])
    .map((p: any) => [Number(p?.[0] ?? p?.lng ?? p?.getLng?.()), Number(p?.[1] ?? p?.lat ?? p?.getLat?.())])
    .filter((p: any) => isValidLngLat(p?.[0], p?.[1]))
  if (safePath.length < 2) return

  polyline.value = new AMap.Polyline({
    path: safePath,
    isOutline: true,
    outlineColor: '#ffffff',
    borderWeight: 2,
    strokeColor: isDashed ? '#ff4d4f' : '#1890ff', 
    strokeOpacity: 0.9,
    strokeWeight: 6,
    lineJoin: 'round',
    lineCap: 'round',
    zIndex: 100,
    showDir: true,
    dirColor: '#ffffff',
    strokeStyle: isDashed ? 'dashed' : 'solid',
  })
  map.value.add(polyline.value)

  // 强制触发一次视野调整
  if (props.autoFit || force) {
    setTimeout(() => {
      if (!polyline.value) return
      const points: number[][] = [...safePath]
      ;(props.markers || []).forEach((m: any) => {
        const normalized = normalizePoint({ lng: m?.lng, lat: m?.lat })
        if (!normalized) return
        points.push([normalized.lng, normalized.lat])
      })
      safeSetBounds(points, [50, 50, 50, 50], undefined, force)
    }, 100)
  }

  // 路径绘制后触发 resize，确保地图正确渲染
  nextTick(() => {
    try {
      map.value?.resize?.()
    } catch {
      // ignore
    }
  })
  ensureInteractive()
}

/** 路径绘制动画：沿路径逐步显示 */
const animateRoute = (path: number[][]): void => {
  if (!polyline.value || path.length < 2) return
  const duration = 600
  const stepMs = 35
  const steps = Math.max(2, Math.floor(duration / stepMs))
  let currentStep = 0
  polyline.value.setPath([path[0], path[1]])
  const timer = setInterval(() => {
    currentStep++
    const progress = Math.min(1, currentStep / steps)
    const endIdx = Math.max(1, Math.floor(progress * path.length))
    const slice = path.slice(0, endIdx + 1)
    if (polyline.value && slice.length >= 2) {
      polyline.value.setPath(slice)
    }
    if (currentStep >= steps) {
      clearInterval(timer)
      if (polyline.value) polyline.value.setPath(path)
    }
  }, stepMs)
}

/**
 * 更新实时轨迹
 */
const updateTrack = (trackPoints: RoutePoint[]): void => {
  const AMap = (window as any).AMap
  if (!map.value || !AMap || trackPoints.length === 0) {
    return
  }

  const path = downsamplePath(
    trackPoints
      .map((p) => normalizePoint(p))
      .filter((p): p is RoutePoint => !!p && isValidLngLat(p.lng, p.lat))
      .map((p) => [p.lng, p.lat]),
    15,
  )
  if (path.length === 0) return

  if (trackPolyline.value) {
    trackPolyline.value.setPath(path)
  } else {
    trackPolyline.value = new AMap.Polyline({
      path: path,
      strokeColor: '#9bb3d3',
      strokeOpacity: 0.6,
      strokeWeight: 2,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 40,
    })
    map.value.add(trackPolyline.value)
  }
}

/**
 * 更新轨迹回放高亮段
 */
const updateReplaySegment = (trackPoints: RoutePoint[]): void => {
  const AMap = (window as any).AMap
  if (!map.value || !AMap || trackPoints.length === 0) {
    return
  }
  const path = downsamplePath(
    trackPoints
      .map((p) => normalizePoint(p))
      .filter((p): p is RoutePoint => !!p && isValidLngLat(p.lng, p.lat))
      .map((p) => [p.lng, p.lat]),
    15,
  )
  if (path.length === 0) return
  if (replayPolyline.value) {
    replayPolyline.value.setPath(path)
  } else {
    replayPolyline.value = new AMap.Polyline({
      path: path,
      strokeColor: '#ff4d4f',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 60,
    })
    map.value.add(replayPolyline.value)
  }
}

/**
 * 地图缩放（兼容 AMap 2.0）
 */
const zoomIn = (): void => {
  if (!map.value) return
  try {
    if (typeof map.value.zoomIn === 'function') {
      map.value.zoomIn()
    } else {
      const z = map.value.getZoom?.() ?? 11
      map.value.setZoom?.(Math.min(20, z + 1))
    }
  } catch (e) {
    console.warn('zoomIn failed:', e)
  }
}

const zoomOut = (): void => {
  if (!map.value) return
  try {
    if (typeof map.value.zoomOut === 'function') {
      map.value.zoomOut()
    } else {
      const z = map.value.getZoom?.() ?? 11
      map.value.setZoom?.(Math.max(3, z - 1))
    }
  } catch (e) {
    console.warn('zoomOut failed:', e)
  }
}

const resetView = (): void => {
  if (!map.value || !(window as any).AMap) return

  const points: number[][] = []
  if (props.markers && props.markers.length > 0) {
    props.markers.forEach((m) => {
      const normalized = normalizePoint({ lng: m.lng, lat: m.lat })
      if (!normalized || !isValidLngLat(normalized.lng, normalized.lat)) return
      points.push([normalized.lng, normalized.lat])
    })
  }
  if (props.route && props.route.length > 0) {
    props.route.forEach((p) => {
      const normalized = normalizePoint(p)
      if (!normalized || !isValidLngLat(normalized.lng, normalized.lat)) return
      points.push([normalized.lng, normalized.lat])
    })
  }
  if (points.length > 0 && props.autoFit) {
    safeSetBounds(points, [50, 50, 50, 50])
    return
  }
  if (props.center) {
    const normalized = normalizePoint(props.center as RoutePoint)
    if (normalized && isValidLngLat(normalized.lng, normalized.lat)) {
      map.value.setCenter([normalized.lng, normalized.lat])
      map.value.setZoom(props.zoom)
    }
  } else {
    // 默认视野
    map.value.setZoomAndCenter(11, [121.4737, 31.2304])
  }
}

/**
 * 主动定位当前位置
 */
const locateNow = (): void => {
  if (!map.value || !(window as any).AMap) {
    emit('locate-error', '地图尚未就绪')
    return
  }
  const AMap = (window as any).AMap
  let finished = false
  let timeoutId: number | null = null
  let bestAccuracy: number | null = null
  const cacheKey = 'amap_last_location'
  let lastAccuracy = Number.POSITIVE_INFINITY
  const getZoomByAccuracy = (accuracy?: number): number => {
    if (!Number.isFinite(accuracy)) return props.zoom || 16
    if (accuracy! <= 20) return 19
    if (accuracy! <= 50) return 18
    if (accuracy! <= 100) return 16
    return 14
  }
  const applyLocate = (
    lng: number,
    lat: number,
    zoom?: number,
    accuracy?: number,
    message?: string,
    final = false,
  ) => {
    if (finished && accuracy !== undefined && accuracy >= lastAccuracy) return
    if (accuracy !== undefined && accuracy >= lastAccuracy) return
    lastAccuracy = accuracy ?? lastAccuracy
    if (timeoutId) window.clearTimeout(timeoutId)
    const targetZoom = zoom ?? getZoomByAccuracy(accuracy)
    map.value.setZoomAndCenter(targetZoom, [lng, lat])
    if (message) emit('locate-progress', message)
    let emitLng = lng
    let emitLat = lat
    if (props.coordType === 'wgs84') {
      const wgs = gcj02ToWgs84(lng, lat)
      emitLng = wgs.lng
      emitLat = wgs.lat
    }
    emit('located', { lng: emitLng, lat: emitLat })
    void reverseGeocode(lng, lat).then((address) => {
      if (address) {
        emit('located', { lng: emitLng, lat: emitLat, address })
      }
    })
    if (final) {
      finished = true
      if (timeoutId) window.clearTimeout(timeoutId)
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ lng, lat, ts: Date.now() }))
      } catch {
        // ignore
      }
    }
  }
  const failLocate = (message?: string) => {
    if (finished) return
    finished = true
    if (timeoutId) window.clearTimeout(timeoutId)
    let fallbackUsed = false
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const cached = JSON.parse(raw)
        if (isValidLngLat(cached?.lng, cached?.lat)) {
          map.value.setZoomAndCenter(16, [cached.lng, cached.lat])
          let emitLng = cached.lng
          let emitLat = cached.lat
          if (props.coordType === 'wgs84') {
            const wgs = gcj02ToWgs84(cached.lng, cached.lat)
            emitLng = wgs.lng
            emitLat = wgs.lat
          }
          emit('located', { lng: emitLng, lat: emitLat })
          emit('locate-error', '已回退到最近一次定位')
          fallbackUsed = true
        }
      }
    } catch {
      // ignore
    }
    if (!fallbackUsed) {
      emit('locate-error', message || '定位失败')
    }
  }
  const tryBrowserHighAccuracy = (): Promise<{
    lng: number
    lat: number
    accuracy: number
  } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null)
      let best: { lng: number; lat: number; accuracy: number } | null = null
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lng = pos.coords.longitude
          const lat = pos.coords.latitude
          const accuracy = pos.coords.accuracy ?? 9999
          if (!isValidLngLat(lng, lat)) return
          if (!best || accuracy < best.accuracy) {
            best = { lng, lat, accuracy }
            bestAccuracy = accuracy
          }
          if (accuracy <= 30) {
            navigator.geolocation.clearWatch(watchId)
            resolve(best)
          }
        },
        () => {
          navigator.geolocation.clearWatch(watchId)
          resolve(best)
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
      )
      window.setTimeout(() => {
        navigator.geolocation.clearWatch(watchId)
        resolve(best)
      }, 9000)
    })
  }
  const fallbackCityLocate = (reason?: string) => {
    if (finished) return
    try {
      const citySearch = new AMap.CitySearch()
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete') {
          let center: [number, number] | null = null
          if (result?.bounds?.getCenter) {
            const c = result.bounds.getCenter()
            center = [c.getLng(), c.getLat()]
          } else if (typeof result?.rectangle === 'string') {
            const [p1, p2] = result.rectangle.split(';')
            if (p1 && p2) {
              const [lng1, lat1] = p1.split(',').map(Number)
              const [lng2, lat2] = p2.split(',').map(Number)
              if (isValidLngLat(lng1, lat1) && isValidLngLat(lng2, lat2)) {
                center = [(lng1 + lng2) / 2, (lat1 + lat2) / 2]
              }
            }
          } else if (result?.center) {
            const lng = result.center.lng ?? result.center.getLng?.()
            const lat = result.center.lat ?? result.center.getLat?.()
            if (isValidLngLat(lng, lat)) center = [lng, lat]
          }
          if (center) {
            applyLocate(center[0], center[1], 12, 9999, reason || '已使用城市级定位', true)
            return
          }
        }
        failLocate(reason || '定位失败')
      })
    } catch {
      failLocate(reason || '定位失败')
    }
  }
  const fallbackBrowserLocate = (reason?: string) => {
    if (finished) return
    if (!navigator.geolocation) {
      fallbackCityLocate(reason || '浏览器定位不可用')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let lng = pos.coords.longitude
        let lat = pos.coords.latitude
        const accuracy = pos.coords.accuracy ?? 9999
        if (!isValidLngLat(lng, lat)) {
          fallbackCityLocate('浏览器定位数据无效')
          return
        }
        const converted = wgs84ToGcj02(lng, lat)
        lng = converted.lng
        lat = converted.lat
        if (accuracy > 80) {
          applyLocate(lng, lat, undefined, accuracy, '已获取粗略位置，正在提高精度...')
          fallbackCityLocate(reason || '定位精度较低')
          return
        }
        applyLocate(lng, lat, undefined, accuracy, undefined, true)
      },
      (err) => {
        fallbackCityLocate(err?.message || '浏览器定位失败')
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    )
  }
  try {
    timeoutId = window.setTimeout(() => {
      fallbackBrowserLocate('定位超时，已改用浏览器定位')
    }, 6500)
    emit('locate-progress', '正在提高精度...')
    void tryBrowserHighAccuracy().then((best) => {
      if (!best || finished) return
      const converted = wgs84ToGcj02(best.lng, best.lat)
      if (best.accuracy <= 50) {
        applyLocate(converted.lng, converted.lat, undefined, best.accuracy, undefined, true)
      }
    })
    const geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      convert: true,
      showButton: false,
      position: 'RB',
    })
    geolocation.getCurrentPosition((status: string, result: any) => {
      if (status === 'complete' && result?.position) {
        const lng = result.position.getLng?.()
        const lat = result.position.getLat?.()
        if (!isValidLngLat(lng, lat)) {
          fallbackBrowserLocate('高德定位数据无效')
          return
        }
        if (Number.isFinite(result?.accuracy) && result.accuracy > 80) {
          if (bestAccuracy !== null && bestAccuracy <= 50) {
            return
          }
          applyLocate(lng, lat, undefined, result.accuracy, '已获取粗略位置，正在提高精度...')
          fallbackBrowserLocate('定位精度较低，尝试更精确定位')
          return
        }
        applyLocate(lng, lat, undefined, result?.accuracy, undefined, true)
      } else {
        fallbackBrowserLocate(result?.message || '高德定位失败')
      }
    })
  } catch (e) {
    console.warn('Geolocation failed:', e)
    fallbackBrowserLocate('高德定位异常')
  }
}

const retry = (): void => {
  error.value = ''
  initMap()
}

const refreshRoute = (forceFit = false): void => {
  safeUpdate(forceFit, 'expose.refreshRoute')
}

const isValidLngLat = (lng?: number | string, lat?: number | string): boolean => {
  if (lng === undefined || lat === undefined) return false
  const nLng = Number(lng)
  const nLat = Number(lat)
  if (!Number.isFinite(nLng) || !Number.isFinite(nLat)) return false
  if (nLng < -180 || nLng > 180 || nLat < -90 || nLat > 90) return false
  return true
}

const isSamePoint = (a: number[], b: number[]): boolean => {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
}

const safeSetBounds = (points: number[][], padding: number[], fallbackZoom?: number, force = false): void => {
  if (!map.value || !(window as any).AMap) return
  // 仅在 props.autoFit 为 true 或者 force 为 true 时执行
  if (!props.autoFit && !force) return
  if (!mapReady.value) return
  if (userInteracted && !force) return
  try {
    const size = map.value.getSize?.()
    if (!size || !Number.isFinite(size.width) || !Number.isFinite(size.height) || size.width <= 0 || size.height <= 0) {
      return
    }
  } catch {
    return
  }

  const AMap = (window as any).AMap
  const valid = points
    .map((p) => [Number(p?.[0]), Number(p?.[1])])
    .filter((p) => isValidLngLat(p?.[0], p?.[1]))

  if (valid.length === 0) return

  const first = valid[0]
  const allSame = valid.every((p) => isSamePoint(p, first))

  if (allSame) {
    map.value.setCenter(first)
    try {
      const z = typeof map.value.getZoom === 'function' ? map.value.getZoom() : undefined
      map.value.setZoom(fallbackZoom || z || props.zoom || 12)
    } catch {}
    return
  }

  try {
    let minLng = valid[0][0]
    let maxLng = valid[0][0]
    let minLat = valid[0][1]
    let maxLat = valid[0][1]
    for (let i = 1; i < valid.length; i++) {
      const lng = valid[i][0]
      const lat = valid[i][1]
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
    const bounds = new AMap.Bounds([minLng, minLat], [maxLng, maxLat])
    dbgFitCount++
    dbgLastFit = { time: Date.now(), type: 'setBounds', points: valid.length, force }
    dbg('fit', dbgLastFit)
    map.value.setBounds(bounds)
    ensureInteractive()
  } catch {
    try {
      map.value.setCenter(first)
      ensureInteractive()
    } catch {}
  }
}

const reverseGeocode = (lng: number, lat: number): Promise<string> => {
  return new Promise((resolve) => {
    if (!geocoder.value) return resolve('')
    geocoder.value.getAddress([lng, lat], (status: string, result: any) => {
      if (status === 'complete' && result?.regeocode?.formattedAddress) {
        resolve(result.regeocode.formattedAddress)
        return
      }
      resolve('')
    })
  })
}

const normalizePoint = (point: RoutePoint | any): RoutePoint | null => {
  if (!point) return null
  const rawLng = Array.isArray(point)
    ? point[0]
    : (point as any).lng ??
      (point as any).longitude ??
      (point as any).lon ??
      (point as any).x ??
      (point as any).lngLat?.lng ??
      (point as any).lnglat?.lng
  const rawLat = Array.isArray(point)
    ? point[1]
    : (point as any).lat ??
      (point as any).latitude ??
      (point as any).y ??
      (point as any).lngLat?.lat ??
      (point as any).lnglat?.lat
  const lng = Number(rawLng)
  const lat = Number(rawLat)
  if (!isValidLngLat(lng, lat)) return null
  if (props.coordType === 'gcj02') {
    return { ...point, lng, lat }
  }
  if (props.coordType === 'bd09') {
    const gcj = bd09ToGcj02(lng, lat)
    return isValidLngLat(gcj.lng, gcj.lat) ? { ...point, lng: gcj.lng, lat: gcj.lat } : null
  }
  if (props.coordType === 'wgs84') {
    const gcj = wgs84ToGcj02(lng, lat)
    return isValidLngLat(gcj.lng, gcj.lat) ? { ...point, lng: gcj.lng, lat: gcj.lat } : null
  }
  return { ...point, lng, lat }
}

/** 检测路径是否为直线（后端兜底直线插值） */
const isPathStraightLine = (path: number[][]): boolean => {
  if (path.length < 3) return true
  const straightDist = haversineMeters(path[0], path[path.length - 1])
  let actualDist = 0
  for (let i = 0; i < path.length - 1; i++) {
    actualDist += haversineMeters(path[i], path[i + 1])
  }
  return actualDist < straightDist * 1.05 // 实际距离接近直线则视为直线
}

const buildRoadAlignedPath = (path: number[][], AMap: any): Promise<number[][]> => {
  return new Promise((resolve, reject) => {
    const safePath = path.filter((p) => isValidLngLat(p?.[0], p?.[1]))
    if (!driving.value || safePath.length < 2) {
      resolve(safePath)
      return
    }
    const origin = new AMap.LngLat(safePath[0][0], safePath[0][1])
    const destination = new AMap.LngLat(
      safePath[safePath.length - 1][0],
      safePath[safePath.length - 1][1],
    )
    // 直线路径或点少时仅用起终点，保证沿道路贴合
    const waypoints = isPathStraightLine(safePath) || safePath.length < 5
      ? []
      : buildWaypoints(safePath, AMap)
    driving.value.search(origin, destination, { waypoints }, (status: string, result: any) => {
      if (status !== 'complete' || !result?.routes?.length) {
        reject(new Error('driving failed'))
        return
      }
      const route = result.routes[0]
      const roadPath: number[][] = []
      route.steps?.forEach((step: any) => {
        step.path?.forEach((lnglat: any) => {
          roadPath.push([lnglat.lng, lnglat.lat])
        })
      })
      const merged = dedupePath(roadPath.length > 1 ? roadPath : path)
      resolve(downsamplePath(merged, 10))
    })
  })
}

const buildWaypoints = (path: number[][], AMap: any): any[] => {
  const safePath = path.filter((p) => isValidLngLat(p?.[0], p?.[1]))
  if (safePath.length <= 2) return []
  const maxWaypoints = 8
  const step = Math.max(1, Math.ceil((safePath.length - 2) / maxWaypoints))
  const points: any[] = []
  for (let i = 1; i < safePath.length - 1; i += step) {
    const p = safePath[i]
    if (!isValidLngLat(p?.[0], p?.[1])) continue
    points.push(new AMap.LngLat(p[0], p[1]))
  }
  return points
}

const dedupePath = (path: number[][]): number[][] => {
  const result: number[][] = []
  path.forEach((p) => {
    if (result.length === 0) {
      result.push(p)
      return
    }
    const last = result[result.length - 1]
    if (last[0] !== p[0] || last[1] !== p[1]) {
      result.push(p)
    }
  })
  return result
}

const downsamplePath = (path: number[][], minMeters: number): number[][] => {
  if (path.length <= 2) return path
  const result: number[][] = [path[0]]
  let last = path[0]
  for (let i = 1; i < path.length - 1; i++) {
    const current = path[i]
    if (haversineMeters(last, current) >= minMeters) {
      result.push(current)
      last = current
    }
  }
  result.push(path[path.length - 1])
  return result
}

const haversineMeters = (p1: number[], p2: number[]): number => {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(p2[1] - p1[1])
  const dLng = toRad(p2[0] - p1[0])
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const outOfChina = (lng: number, lat: number): boolean => {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

const transformLat = (lng: number, lat: number): number => {
  let ret =
    -100.0 +
    2.0 * lng +
    3.0 * lat +
    0.2 * lat * lat +
    0.1 * lng * lat +
    0.2 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin((lat / 3.0) * Math.PI)) * 2.0) / 3.0
  ret +=
    ((160.0 * Math.sin((lat / 12.0) * Math.PI) + 320 * Math.sin((lat * Math.PI) / 30.0)) * 2.0) /
    3.0
  return ret
}

const transformLng = (lng: number, lat: number): number => {
  let ret =
    300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += ((20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin((lng / 3.0) * Math.PI)) * 2.0) / 3.0
  ret +=
    ((150.0 * Math.sin((lng / 12.0) * Math.PI) + 300.0 * Math.sin((lng / 30.0) * Math.PI)) * 2.0) /
    3.0
  return ret
}

const wgs84ToGcj02 = (lng: number, lat: number): { lng: number; lat: number } => {
  if (outOfChina(lng, lat)) {
    return { lng, lat }
  }
  const a = 6378245.0
  const ee = 0.00669342162296594323
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI)
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI)
  const mgLat = lat + dLat
  const mgLng = lng + dLng
  return { lng: mgLng, lat: mgLat }
}

const gcj02ToWgs84 = (lng: number, lat: number): { lng: number; lat: number } => {
  if (outOfChina(lng, lat)) {
    return { lng, lat }
  }
  const a = 6378245.0
  const ee = 0.00669342162296594323
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI)
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI)
  const mgLat = lat + dLat
  const mgLng = lng + dLng
  return { lng: lng * 2 - mgLng, lat: lat * 2 - mgLat }
}

const bd09ToGcj02 = (lng: number, lat: number): { lng: number; lat: number } => {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin((y * Math.PI * 3000.0) / 180.0)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos((x * Math.PI * 3000.0) / 180.0)
  return { lng: z * Math.cos(theta), lat: z * Math.sin(theta) }
}

// 监听属性变化
watch(markersKey, () => {
  userInteracted = false
  safeUpdate(false, 'watch.markersKey')
})
watch(
  () => props.center,
  () => {
    if (props.center && map.value) {
      // 仅当没有标记和路径时，才允许通过 center 调整视野，避免单点覆盖
      const markerCount = props.markers?.length || 0
      const routeCount = props.route?.length || 0
      // 只要有任何标记或路线，就绝对禁止通过 center 属性移动地图
      if (markerCount > 0 || routeCount > 0) {
        return
      }
      const normalized = normalizePoint(props.center as RoutePoint)
      if (normalized && isValidLngLat(normalized.lng, normalized.lat)) {
        try {
          map.value.setCenter([normalized.lng, normalized.lat])
        } catch (e) {
          console.warn('setCenter failed:', e)
        }
      }
    }
  },
  { deep: true },
)
watch(routeKey, () => safeUpdate(false, 'watch.routeKey'))

onMounted(() => {
  nextTick(() => {
    initMap()
  })
})

onBeforeUnmount(() => {
  if (polyline.value) {
    map.value?.remove(polyline.value)
  }
  if (trackPolyline.value) {
    map.value?.remove(trackPolyline.value)
  }
  if (replayPolyline.value) {
    map.value?.remove(replayPolyline.value)
  }
  markerMap.forEach((marker) => {
    marker.setMap(null)
  })
  markerMap.clear()
  map.value?.destroy()
})

// 暴露方法供父组件调用
defineExpose({
  updateTrack,
  updateReplaySegment,
  refreshRoute,
  zoomIn,
  zoomOut,
  resetView,
  locateNow,
  getDebugState: () => ({
    updateCount: dbgUpdateCount,
    fitCount: dbgFitCount,
    lastUpdate: dbgLastUpdate,
    lastFit: dbgLastFit,
    markersKey: markersKey.value,
    routeKey: routeKey.value,
  }),
})
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 400px;
}

.map-wrapper {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background: #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  pointer-events: auto;
  touch-action: auto;
}

.map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  pointer-events: auto;
  touch-action: auto;
}

.map-wrapper :deep(.el-loading-mask),
.map-wrapper :deep(.el-loading-spinner) {
  pointer-events: none;
}

.map :deep(.amap-container) {
  touch-action: auto;
}

.error-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  border-radius: 8px;
}

.map-toolbar {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2001;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  padding: 6px 8px;
  display: flex;
  gap: 4px;
  pointer-events: auto;
}

.map-toolbar :deep(.el-button) {
  border: none;
  background: transparent;
  padding: 8px;
}

.map-toolbar :deep(.el-button:hover) {
  background: rgba(24, 144, 255, 0.1);
}
</style>
