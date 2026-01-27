<template>
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
    <!-- 地图工具栏 -->
    <div class="map-toolbar" v-if="showToolbar">
      <el-button-group>
        <el-button size="small" @click="zoomIn">
          <el-icon><Plus /></el-icon>
        </el-button>
        <el-button size="small" @click="zoomOut">
          <el-icon><Minus /></el-icon>
        </el-button>
        <el-button size="small" @click="resetView">
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
import { defineProps, defineEmits, onMounted, onBeforeUnmount, watch, shallowRef, ref, computed } from 'vue'
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
  coordType: 'gcj02',
  showToolbar: true,
  zoom: 11,
  showTrack: false,
  autoFit: true
})

const emit = defineEmits<{
  'map-click': [point: { lng: number; lat: number }]
  'located': [point: { lng: number; lat: number; address?: string }]
  'marker-click': [marker: DroneMarker]
  'locate-error': [message: string]
  'locate-progress': [message: string]
}>()

const containerId = `amap-${Math.random().toString(36).substr(2, 9)}`
const map = shallowRef<any>(null)
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

/**
 * 初始化地图
 */
const initMap = (): void => {
  loading.value = true
  error.value = ''
  
  const envKey = import.meta.env.VITE_AMAP_KEY
  const envSecurity = import.meta.env.VITE_AMAP_SECURITY

  // 优先使用前端环境变量配置，便于本地调试
  const loadConfig = envKey
    ? Promise.resolve({ key: envKey, security: envSecurity })
    : request.get('/route/config')
        .then((cfg: any) => {
          const data = cfg?.data || cfg
          AMAP_KEY = data?.key || ''
          AMAP_SECURITY_CODE = data?.securityJsCode || ''
          return { key: AMAP_KEY, security: AMAP_SECURITY_CODE }
        })
        .catch(() => {
          return { key: '', security: '' }
        })
  
  loadConfig.then((config) => {
    if (!config.key) {
      throw new Error('地图Key未配置或获取失败，请配置 VITE_AMAP_KEY / 后端 amap.key')
    }

    // 设置安全密钥
    ;(window as any)._AMapSecurityConfig = {
      securityJsCode: config.security || ''
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
        'AMap.InfoWindow'
      ],
    })
  })
  .then((AMap) => {
    loading.value = false
    error.value = ''
    
    const centerPoint = props.center
      ? (() => {
        const normalized = normalizePoint(props.center as RoutePoint)
        if (isValidLngLat(normalized?.lng, normalized?.lat)) {
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
    })

    // 兜底添加基础底图层，防止样式/容器问题导致空白
    try {
      const baseLayer = new AMap.TileLayer()
      map.value.add(baseLayer)
    } catch {}

    // 等待地图加载完成
    map.value.on('complete', () => {
      console.log('地图加载完成')
      map.value?.resize()
      if (props.markers && props.markers.length > 0) {
        updateMarkers()
      }
      if (props.route && props.route.length > 0) {
        updateRoute()
      }
      if (!props.center) {
        // 默认定位到当前位置（带浏览器定位兜底）
        locateNow()
      }
    })

    // 地图点击事件
    map.value.on('click', (e: any) => {
      emit('map-click', { lng: e.lnglat.getLng(), lat: e.lnglat.getLat() })
    })

    // 初始化路径规划插件（不显示在地图上）
    driving.value = new AMap.Driving({
      map: null, // 不显示在地图上
      policy: AMap.DrivingPolicy.LEAST_TIME,
      hideMarkers: true,
    })

    // 添加工具栏和比例尺
    const toolbar = new AMap.ToolBar({
      position: 'RB',
      offset: new AMap.Pixel(10, 10)
    })
    const scale = new AMap.Scale({
      position: 'LB',
      offset: new AMap.Pixel(10, 10)
    })
    map.value.addControl(toolbar)
    map.value.addControl(scale)

    // 初始化地理编码器（用于精确地址）
    try {
      geocoder.value = new AMap.Geocoder({
        radius: 200,
        extensions: 'all'
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
const updateMarkers = (): void => {
  if (!map.value || !(window as any).AMap) {
    return
  }

  const AMap = (window as any).AMap
  const currentIds = new Set<string | number>()
  
  props.markers?.forEach((m) => {
    if (!isValidLngLat(m.lng, m.lat)) return
    const normalized = normalizePoint({ lng: m.lng, lat: m.lat })
    if (!isValidLngLat(normalized?.lng, normalized?.lat)) return
    currentIds.add(m.id)
    
    if (markerMap.has(m.id)) {
      // 更新现有标记位置
      const marker = markerMap.get(m.id)
      marker.setPosition([normalized.lng, normalized.lat])
      
      // 更新信息窗口内容
      const infoContent = createInfoWindowContent(m)
      marker.setContent(infoContent)
    } else {
      // 创建新标记
      const infoContent = createInfoWindowContent(m)
      
      const marker = new AMap.Marker({
        position: [normalized.lng, normalized.lat],
        content: infoContent,
        offset: new AMap.Pixel(-15, -30),
        anchor: 'bottom-center',
        zIndex: 100,
        animation: 'AMAP_ANIMATION_DROP', // 添加动画效果
      })
      
      marker.on('click', () => {
        emit('marker-click', m)
      })
      
      marker.setMap(map.value)
      markerMap.set(m.id, marker)
    }
  })

  // 移除不存在的标记
  markerMap.forEach((marker, id) => {
    if (!currentIds.has(id)) {
      marker.setMap(null)
      markerMap.delete(id)
    }
  })
  
  // 如果有标记，自动调整视野
  if (props.markers && props.markers.length > 0 && props.autoFit) {
    const points: number[][] = []
    props.markers.forEach(m => {
      if (!isValidLngLat(m.lng, m.lat)) return
      const normalized = normalizePoint({ lng: m.lng, lat: m.lat })
      if (!isValidLngLat(normalized?.lng, normalized?.lat)) return
      points.push([normalized.lng, normalized.lat])
    })
    if (points.length > 0) {
      safeSetBounds(points, [20, 20, 20, 20])
    }
  }
}

/**
 * 创建信息窗口内容
 */
const createInfoWindowContent = (marker: DroneMarker): string => {
  const statusColor = getStatusColor(marker.status)
  const statusText = getStatusText(marker.status)
  const batteryColor = marker.batteryLevel && marker.batteryLevel < 20 ? '#ff4d4f' : '#52c41a'
  
  // 创建更美观的标记点
  return `
    <div style="
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2px;
      border-radius: 50%;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    ">
      <div style="
        background: white;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      ">
        <div style="
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: ${statusColor};
          border: 2px solid white;
          box-shadow: 0 0 8px ${statusColor};
          position: relative;
        ">
          <div style="
            position: absolute;
            top: -2px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 4px solid transparent;
            border-right: 4px solid transparent;
            border-top: 6px solid ${statusColor};
          "></div>
        </div>
      </div>
    </div>
  `
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
 * 获取标记图标（简化版，使用HTML）
 */
const getMarkerIcon = (status?: string, batteryLevel?: number): string => {
  // 返回空字符串，使用HTML内容
  return ''
}

/**
 * 更新路径（沿道路正上方飞行路径）
 */
const updateRoute = async (): Promise<void> => {
  if (!map.value || !(window as any).AMap || !props.route || props.route.length === 0) {
    if (polyline.value && map.value) {
      map.value.remove(polyline.value)
      polyline.value = null
    }
    return
  }

  const AMap = (window as any).AMap
  const normalizedRoute = props.route.map(p => normalizePoint(p)).filter(p => isValidLngLat(p?.lng, p?.lat))
  const rawPath = normalizedRoute.map(p => [p.lng, p.lat])
  const seq = ++routeRenderSeq
  const path = downsamplePath(rawPath, 20)
  if (path.length < 2) {
    if (polyline.value) {
      map.value.remove(polyline.value)
      polyline.value = null
    }
    return
  }
  
  if (polyline.value) {
    polyline.value.setPath(path)
  } else {
    // 创建沿道路正上方飞行的路径线
    polyline.value = new AMap.Polyline({
      path: path,
      isOutline: true,
      outlineColor: '#ffffff',
      borderWeight: 3,
      strokeColor: '#1890ff',
      strokeOpacity: 0.95,
      strokeWeight: 6,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 50,
      showDir: true, // 显示方向箭头
      dirColor: '#1890ff',
      dirImg: 'https://webapi.amap.com/images/dir.png', // 方向箭头图标
      strokeStyle: 'solid', // 实线
      strokeDasharray: null, // 不使用虚线
    })
    map.value.add(polyline.value)
    
    // 添加路径动画效果（可选）
    if (path.length > 1) {
      // 可以添加路径绘制动画
      animateRoute(path)
    }
  }
  
  // 异步计算路网贴合路径（失败则保持当前路径）
  if (path.length >= 2 && driving.value) {
    try {
      const roadPath = await buildRoadAlignedPath(path, AMap)
      if (seq !== routeRenderSeq) return
      if (roadPath.length >= 2) {
        polyline.value?.setPath(roadPath)
      }
    } catch (e) {
      // ignore
    }
  }

  // 自动调整视野，包含路径和标记点
  if (path.length > 0 && props.autoFit) {
    const points: number[][] = []
    path.forEach((p: number[]) => {
      if (!isValidLngLat(p?.[0], p?.[1])) return
      points.push([p[0], p[1]])
    })
    if (props.markers && props.markers.length > 0) {
      props.markers.forEach(m => {
        if (!isValidLngLat(m.lng, m.lat)) return
        points.push([m.lng, m.lat])
      })
    }
    if (points.length > 0) {
      safeSetBounds(points, [50, 50, 50, 50])
    }
  }
}

/**
 * 路径动画效果（可选）
 */
const animateRoute = (path: number[][]): void => {
  // 可以在这里实现路径绘制动画
  // 例如：逐步显示路径点
}

/**
 * 更新实时轨迹
 */
const updateTrack = (trackPoints: RoutePoint[]): void => {
  if (!map.value || !window.AMap || trackPoints.length === 0) {
    return
  }

  const path = downsamplePath(
    trackPoints
      .map(p => normalizePoint(p))
      .filter(p => isValidLngLat(p?.lng, p?.lat))
      .map(p => [p.lng, p.lat]),
    15
  )
  if (path.length === 0) return
  
  if (trackPolyline.value) {
    trackPolyline.value.setPath(path)
  } else {
    trackPolyline.value = new window.AMap.Polyline({
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
  if (!map.value || !window.AMap || trackPoints.length === 0) {
    return
  }
  const path = downsamplePath(
    trackPoints
      .map(p => normalizePoint(p))
      .filter(p => isValidLngLat(p?.lng, p?.lat))
      .map(p => [p.lng, p.lat]),
    15
  )
  if (path.length === 0) return
  if (replayPolyline.value) {
    replayPolyline.value.setPath(path)
  } else {
    replayPolyline.value = new window.AMap.Polyline({
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
 * 地图缩放
 */
const zoomIn = (): void => {
  if (map.value) {
    map.value.zoomIn()
  }
}

const zoomOut = (): void => {
  if (map.value) {
    map.value.zoomOut()
  }
}

const resetView = (): void => {
  if (!map.value || !(window as any).AMap) return
  
  const AMap = (window as any).AMap
  
  if (props.markers && props.markers.length > 0 && props.autoFit) {
    const points: number[][] = []
    props.markers.forEach(m => {
      if (!isValidLngLat(m.lng, m.lat)) return
      const normalized = normalizePoint({ lng: m.lng, lat: m.lat })
      if (!isValidLngLat(normalized?.lng, normalized?.lat)) return
      points.push([normalized.lng, normalized.lat])
    })
    if (points.length > 0) {
      safeSetBounds(points, [30, 30, 30, 30])
    }
  } else if (props.route && props.route.length > 0 && props.autoFit) {
    const points: number[][] = []
    props.route.forEach(p => {
      const normalized = normalizePoint(p)
      if (!isValidLngLat(normalized?.lng, normalized?.lat)) return
      points.push([normalized.lng, normalized.lat])
    })
    if (points.length > 0) {
      safeSetBounds(points, [30, 30, 30, 30])
    }
  } else if (props.center) {
    const normalized = normalizePoint(props.center as RoutePoint)
    if (isValidLngLat(normalized?.lng, normalized?.lat)) {
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
  const applyLocate = (lng: number, lat: number, zoom?: number, accuracy?: number, message?: string, final = false) => {
    if (finished && accuracy !== undefined && accuracy >= lastAccuracy) return
    if (accuracy !== undefined && accuracy >= lastAccuracy) return
    lastAccuracy = accuracy ?? lastAccuracy
    if (timeoutId) window.clearTimeout(timeoutId)
    const targetZoom = zoom ?? getZoomByAccuracy(accuracy)
    map.value.setZoomAndCenter(targetZoom, [lng, lat])
    if (message) emit('locate-progress', message)
    emit('located', { lng, lat })
    void reverseGeocode(lng, lat).then((address) => {
      if (address) {
        emit('located', { lng, lat, address })
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
          emit('located', { lng: cached.lng, lat: cached.lat })
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
  const tryBrowserHighAccuracy = (): Promise<{ lng: number; lat: number; accuracy: number } | null> => {
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
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
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

const isValidLngLat = (lng?: number, lat?: number): boolean => {
  if (lng === undefined || lat === undefined) return false
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return false
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) return false
  return true
}

const isSamePoint = (a: number[], b: number[]): boolean => {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
}

const safeSetBounds = (points: number[][], padding: number[], fallbackZoom?: number): void => {
  if (!map.value || !(window as any).AMap) return
  const AMap = (window as any).AMap
  const valid = points.filter(p => isValidLngLat(p?.[0], p?.[1]))
  if (valid.length === 0) return
  const first = valid[0]
  const allSame = valid.every(p => isSamePoint(p, first))
  if (allSame) {
    map.value.setCenter(first)
    map.value.setZoom(fallbackZoom || props.zoom || 12)
    return
  }
  const bounds = new AMap.Bounds()
  valid.forEach(p => bounds.extend(p))
  try {
    map.value.setBounds(bounds, false, padding)
  } catch {
    map.value.setCenter(first)
    map.value.setZoom(fallbackZoom || props.zoom || 12)
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

const normalizePoint = (point: RoutePoint): RoutePoint => {
  if (!point || props.coordType === 'gcj02') {
    return point
  }
  if (props.coordType === 'bd09') {
    const gcj = bd09ToGcj02(point.lng, point.lat)
    return { ...point, lng: gcj.lng, lat: gcj.lat }
  }
  if (props.coordType === 'wgs84') {
    const gcj = wgs84ToGcj02(point.lng, point.lat)
    return { ...point, lng: gcj.lng, lat: gcj.lat }
  }
  return point
}

const buildRoadAlignedPath = (path: number[][], AMap: any): Promise<number[][]> => {
  return new Promise((resolve, reject) => {
    const safePath = path.filter(p => isValidLngLat(p?.[0], p?.[1]))
    if (!driving.value || safePath.length < 2) {
      resolve(safePath)
      return
    }
    const origin = new AMap.LngLat(safePath[0][0], safePath[0][1])
    const destination = new AMap.LngLat(safePath[safePath.length - 1][0], safePath[safePath.length - 1][1])
    const waypoints = buildWaypoints(path, AMap)
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
  if (path.length <= 2) return []
  const maxWaypoints = 8
  const step = Math.ceil((path.length - 2) / maxWaypoints)
  const points: any[] = []
    for (let i = 1; i < safePath.length - 1; i += step) {
      points.push(new AMap.LngLat(safePath[i][0], safePath[i][1]))
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
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(p1[1])) * Math.cos(toRad(p2[1])) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const outOfChina = (lng: number, lat: number): boolean => {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

const transformLat = (lng: number, lat: number): number => {
  let ret = -100.0 + 2.0 * lng + 3.0 * lat + 0.2 * lat * lat + 0.1 * lng * lat + 0.2 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lat * Math.PI) + 40.0 * Math.sin(lat / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(lat / 12.0 * Math.PI) + 320 * Math.sin(lat * Math.PI / 30.0)) * 2.0 / 3.0
  return ret
}

const transformLng = (lng: number, lat: number): number => {
  let ret = 300.0 + lng + 2.0 * lat + 0.1 * lng * lng + 0.1 * lng * lat + 0.1 * Math.sqrt(Math.abs(lng))
  ret += (20.0 * Math.sin(6.0 * lng * Math.PI) + 20.0 * Math.sin(2.0 * lng * Math.PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(lng * Math.PI) + 40.0 * Math.sin(lng / 3.0 * Math.PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(lng / 12.0 * Math.PI) + 300.0 * Math.sin(lng / 30.0 * Math.PI)) * 2.0 / 3.0
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
  const radLat = lat / 180.0 * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((a * (1 - ee)) / (magic * sqrtMagic) * Math.PI)
  dLng = (dLng * 180.0) / (a / sqrtMagic * Math.cos(radLat) * Math.PI)
  const mgLat = lat + dLat
  const mgLng = lng + dLng
  return { lng: mgLng, lat: mgLat }
}

const bd09ToGcj02 = (lng: number, lat: number): { lng: number; lat: number } => {
  const x = lng - 0.0065
  const y = lat - 0.006
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000.0 / 180.0)
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000.0 / 180.0)
  return { lng: z * Math.cos(theta), lat: z * Math.sin(theta) }
}

// 监听属性变化
watch(() => props.markers, updateMarkers, { deep: true })
watch(() => props.center, () => {
  if (props.center && map.value) {
    const normalized = normalizePoint(props.center as RoutePoint)
    if (isValidLngLat(normalized?.lng, normalized?.lat)) {
      map.value.setCenter([normalized.lng, normalized.lat])
    }
  }
}, { deep: true })
watch(() => props.route, () => {
  void updateRoute()
}, { deep: true })

onMounted(() => {
  initMap()
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
  markerMap.forEach(marker => {
    marker.setMap(null)
  })
  markerMap.clear()
  map.value?.destroy()
})

// 暴露方法供父组件调用
defineExpose({
  updateTrack,
  updateReplaySegment,
  zoomIn,
  zoomOut,
  resetView,
  locateNow
})
</script>

<style scoped>
.map-wrapper {
  width: 100%;
  height: 100%;
  min-height: 400px;
  position: relative;
  background: #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.map {
  width: 100%;
  height: 100%;
  border-radius: 8px;
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
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
  display: flex;
  gap: 4px;
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

