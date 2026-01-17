<template>
  <div class="map-wrapper" v-loading="loading" element-loading-text="地图加载中...">
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
  /** 是否显示工具栏 */
  showToolbar?: boolean
  /** 初始缩放级别 */
  zoom?: number
  /** 是否显示实时轨迹 */
  showTrack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  markers: () => [],
  showToolbar: true,
  zoom: 11,
  showTrack: false
})

const emit = defineEmits<{
  'map-click': [point: { lng: number; lat: number }]
  'located': [point: { lng: number; lat: number }]
  'marker-click': [marker: DroneMarker]
}>()

const containerId = `amap-${Math.random().toString(36).substr(2, 9)}`
const map = shallowRef<any>(null)
const driving = shallowRef<any>(null)
const polyline = shallowRef<any>(null)
const markerMap = new Map<string | number, any>()
const trackPolyline = shallowRef<any>(null)
const loading = ref(true)
const error = ref('')

let AMAP_KEY = ''
let AMAP_SECURITY_CODE = ''

/**
 * 初始化地图
 */
const initMap = (): void => {
  loading.value = true
  error.value = ''
  
  // 先尝试从后端获取配置，失败则使用默认key
  const loadConfig = request.get('/route/config')
    .then((cfg: any) => {
      const data = cfg?.data || cfg
      AMAP_KEY = data?.key || 'cba88d9bc5d65427d28741b83c5c9948'
      AMAP_SECURITY_CODE = data?.securityJsCode || 'd626388484a44633190897368065d666'
      return { key: AMAP_KEY, security: AMAP_SECURITY_CODE }
    })
    .catch(() => {
      // 如果后端接口失败，使用默认key
      AMAP_KEY = 'cba88d9bc5d65427d28741b83c5c9948'
      AMAP_SECURITY_CODE = 'd626388484a44633190897368065d666'
      return { key: AMAP_KEY, security: AMAP_SECURITY_CODE }
    })
  
  loadConfig.then((config) => {
    if (!config.key) {
      throw new Error('地图Key未配置')
    }
    
    // 设置安全密钥
    ;(window as any)._AMapSecurityConfig = { 
      securityJsCode: config.security 
    }
    
    return AMapLoader.load({
      key: config.key,
      version: '2.0',
      plugins: [
        'AMap.Marker',
        'AMap.Driving',
        'AMap.Geolocation',
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
      ? [props.center.lng, props.center.lat] 
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

    // 等待地图加载完成
    map.value.on('complete', () => {
      console.log('地图加载完成')
      updateMarkers()
      updateRoute()
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
      offset: [10, 10]
    })
    const scale = new AMap.Scale({ 
      position: 'LB',
      offset: [10, 10]
    })
    map.value.addControl(toolbar)
    map.value.addControl(scale)

    // 尝试定位（可选）
    try {
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 5000,
        showButton: false, // 不显示按钮
        position: 'RB',
      })
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete' && !props.center) {
          const lng = result.position.getLng()
          const lat = result.position.getLat()
          map.value.setZoomAndCenter(16, [lng, lat])
          emit('located', { lng, lat })
        }
      })
    } catch (e) {
      console.warn('Geolocation failed:', e)
    }
  })
  .catch((e) => {
    console.error('AMap load failed:', e)
    loading.value = false
    error.value = `地图加载失败: ${e.message || '请检查网络连接或联系管理员'}`
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
    currentIds.add(m.id)
    
    if (markerMap.has(m.id)) {
      // 更新现有标记位置
      const marker = markerMap.get(m.id)
      marker.setPosition([m.lng, m.lat])
      
      // 更新信息窗口内容
      const infoContent = createInfoWindowContent(m)
      marker.setContent(infoContent)
    } else {
      // 创建新标记
      const infoContent = createInfoWindowContent(m)
      
      const marker = new AMap.Marker({
        position: [m.lng, m.lat],
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
  if (props.markers && props.markers.length > 0) {
    const bounds = new AMap.Bounds()
    props.markers.forEach(m => {
      bounds.extend([m.lng, m.lat])
    })
    map.value.setBounds(bounds, false, [20, 20, 20, 20])
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
const updateRoute = (): void => {
  if (!map.value || !(window as any).AMap || !props.route || props.route.length === 0) {
    if (polyline.value && map.value) {
      map.value.remove(polyline.value)
      polyline.value = null
    }
    return
  }

  const AMap = (window as any).AMap
  const path = props.route.map(p => [p.lng, p.lat])
  
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
  
  // 自动调整视野，包含路径和标记点
  if (path.length > 0) {
    const bounds = new AMap.Bounds()
    path.forEach((p: number[]) => {
      bounds.extend(p)
    })
    if (props.markers && props.markers.length > 0) {
      props.markers.forEach(m => {
        bounds.extend([m.lng, m.lat])
      })
    }
    map.value.setBounds(bounds, false, [50, 50, 50, 50])
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

  const path = trackPoints.map(p => [p.lng, p.lat])
  
  if (trackPolyline.value) {
    trackPolyline.value.setPath(path)
  } else {
    trackPolyline.value = new window.AMap.Polyline({
      path: path,
      strokeColor: '#ff4d4f',
      strokeOpacity: 0.6,
      strokeWeight: 3,
      lineJoin: 'round',
      lineCap: 'round',
      zIndex: 40,
    })
    map.value.add(trackPolyline.value)
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
  
  if (props.markers && props.markers.length > 0) {
    const bounds = new AMap.Bounds()
    props.markers.forEach(m => {
      bounds.extend([m.lng, m.lat])
    })
    map.value.setBounds(bounds, false, [30, 30, 30, 30])
  } else if (props.route && props.route.length > 0) {
    const bounds = new AMap.Bounds()
    props.route.forEach(p => {
      bounds.extend([p.lng, p.lat])
    })
    map.value.setBounds(bounds, false, [30, 30, 30, 30])
  } else if (props.center) {
    map.value.setCenter([props.center.lng, props.center.lat])
    map.value.setZoom(props.zoom)
  } else {
    // 默认视野
    map.value.setZoomAndCenter(11, [121.4737, 31.2304])
  }
}

const retry = (): void => {
  error.value = ''
  initMap()
}

// 监听属性变化
watch(() => props.markers, updateMarkers, { deep: true })
watch(() => props.center, () => {
  if (props.center && map.value) {
    map.value.setCenter([props.center.lng, props.center.lat])
  }
}, { deep: true })
watch(() => props.route, updateRoute, { deep: true })

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
  markerMap.forEach(marker => {
    marker.setMap(null)
  })
  markerMap.clear()
  map.value?.destroy()
})

// 暴露方法供父组件调用
defineExpose({
  updateTrack,
  zoomIn,
  zoomOut,
  resetView
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

