<template>
  <div class="task-create">
    <el-page-header @back="$router.back()" style="margin-bottom: 20px">
      <template #content>
        <span class="text-large font-600">创建医疗任务</span>
      </template>
    </el-page-header>

    <el-steps :active="step" finish-status="success" align-center class="steps">
      <el-step title="基本信息" />
      <el-step title="位置选择" />
      <el-step title="路径预览" />
      <el-step title="确认提交" />
    </el-steps>

    <div class="content-wrapper">
      <!-- 步骤1: 基本信息 -->
      <el-card v-if="step === 0" shadow="hover" class="step-card">
        <template #header>
          <div class="card-header">
            <span>任务基本信息</span>
          </div>
        </template>
        <el-form :model="form" label-width="120px" :rules="rules" ref="formRef">
          <el-form-item label="任务类型" prop="type">
            <el-select v-model="form.type" placeholder="请选择任务类型" style="width: 100%">
              <el-option label="物资运输" value="supplies_transport" />
              <el-option label="患者转运" value="transfer_patient" />
              <el-option label="器官运输" value="organ" />
              <el-option label="医生派遣" value="doctor_dispatch" />
            </el-select>
          </el-form-item>
          <el-form-item label="紧急类别">
            <el-select v-model="form.taskCategory" placeholder="请选择紧急程度" style="width: 100%">
              <el-option label="器官冷链急送" value="organ" />
              <el-option label="患者转运" value="patient" />
              <el-option label="急诊医生派遣" value="doctor" />
              <el-option label="物资补给" value="supplies" />
            </el-select>
          </el-form-item>
          <el-form-item label="载重(kg)">
            <el-input-number v-model="form.weightKg" :min="0.1" :max="50" :step="0.5" />
          </el-form-item>
          <el-form-item label="期望完成时限(分钟)">
            <el-input-number v-model="form.slaMinutes" :min="10" :max="240" :step="5" />
          </el-form-item>
          <el-form-item label="优先级" prop="priority">
            <el-rate
              v-model="form.priority"
              :max="5"
              show-text
              :texts="['低', '较低', '中', '较高', '高']"
            />
          </el-form-item>
          <el-form-item label="任务描述" prop="remarks">
            <el-input
              v-model="form.remarks"
              type="textarea"
              :rows="4"
              placeholder="请详细描述任务内容，如：药品名称、数量、紧急程度等"
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 步骤2: 位置选择 -->
      <el-card v-else-if="step === 1" shadow="hover" class="step-card">
        <template #header>
          <div class="card-header">
            <span>选择起点和终点</span>
            <el-button-group>
              <el-button
                :type="selectMode === 'origin' ? 'primary' : ''"
                @click="selectMode = 'origin'"
                size="small"
              >
                选择起点
              </el-button>
              <el-button
                :type="selectMode === 'dest' ? 'primary' : ''"
                @click="selectMode = 'dest'"
                size="small"
              >
                选择终点
              </el-button>
            </el-button-group>
          </div>
        </template>

        <div class="search-section">
          <div class="ride-card">
            <div class="ride-line">
              <div class="ride-dot start"></div>
              <div class="ride-rail"></div>
              <div class="ride-dot end"></div>
            </div>
            <div class="ride-inputs">
              <el-autocomplete
                ref="originInputRef"
                v-model="search.origin"
                :fetch-suggestions="queryOrigin"
                :loading="originLoading"
                :trigger-on-focus="true"
                placeholder="输入起点，如：市立医院"
                @select="onSelectOrigin"
                clearable
                style="width: 100%"
                class="ride-input"
              >
                <template #prefix>
                  <el-icon><Location /></el-icon>
                </template>
                <template #default="{ item }">
                  <div class="tip-item">
                    <div class="tip-name">{{ item.name || item.value }}</div>
                    <div class="tip-address">{{ item.address || item.district || '' }}</div>
                  </div>
                </template>
              </el-autocomplete>
              <el-autocomplete
                ref="destInputRef"
                v-model="search.dest"
                :fetch-suggestions="queryDest"
                :loading="destLoading"
                :trigger-on-focus="true"
                placeholder="输入终点，如：中心医院"
                @select="onSelectDest"
                clearable
                style="width: 100%"
                class="ride-input"
              >
                <template #prefix>
                  <el-icon><LocationFilled /></el-icon>
                </template>
                <template #default="{ item }">
                  <div class="tip-item">
                    <div class="tip-name">{{ item.name || item.value }}</div>
                    <div class="tip-address">{{ item.address || item.district || '' }}</div>
                  </div>
                </template>
              </el-autocomplete>
            </div>
          </div>
          <div class="poi-examples">
            <span class="poi-label">POI搜索示例：</span>
            <el-tag
              v-for="item in poiExamples"
              :key="item"
              size="small"
              class="poi-tag"
              @click="applyPoiExample(item)"
            >
              {{ item }}
            </el-tag>
          </div>
          <div class="locate-actions">
            <el-button size="small" @click="locateNow" :loading="locating">
              <el-icon><Location /></el-icon>
              定位当前位置
            </el-button>
            <el-button size="small" type="primary" @click="useCurrentAsOrigin" :disabled="!currentLocation">
              当前位置设为起点
            </el-button>
            <el-button size="small" type="success" @click="useCurrentAsDest" :disabled="!currentLocation">
              当前位置设为终点
            </el-button>
          </div>
          <div v-if="locateHint" class="locate-hint">
            {{ locateHint }}
          </div>
        </div>

        <div class="map-section">
          <MapContainer
            :markers="markers"
            :center="centerRef"
            :route="previewRoute"
            :coord-type="coordType"
            @located="onLocated"
            @locate-error="onLocateError"
            @locate-progress="locateHint = $event"
            @map-click="onMapClick"
            ref="mapRef"
          />
        </div>

        <div class="coordinate-info">
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="起点坐标">
              <span v-if="form.origin_lat">
                {{ form.origin_lng.toFixed(6) }}, {{ form.origin_lat.toFixed(6) }}
              </span>
              <span v-else class="text-placeholder">未选择</span>
            </el-descriptions-item>
            <el-descriptions-item label="终点坐标">
              <span v-if="form.dest_lat">
                {{ form.dest_lng.toFixed(6) }}, {{ form.dest_lat.toFixed(6) }}
              </span>
              <span v-else class="text-placeholder">未选择</span>
            </el-descriptions-item>
          </el-descriptions>
          <div class="option-flags">
            <el-checkbox v-model="form.avoidNoFlyZones">避开禁飞区</el-checkbox>
            <el-checkbox v-model="form.considerWeather">考虑天气</el-checkbox>
          </div>
        </div>
      </el-card>

      <!-- 步骤3: 路径预览 -->
      <el-card v-else-if="step === 2" shadow="hover" class="step-card">
        <template #header>
          <div class="card-header">
            <span>路径规划预览（沿道路正上方飞行）</span>
            <div class="header-actions">
              <el-button-group>
                <el-button
                  size="small"
                  :type="routeStrategy === 'shortest' ? 'primary' : ''"
                  @click="changeStrategy('shortest')"
                >
                  最短路径
                </el-button>
                <el-button
                  size="small"
                  :type="routeStrategy === 'safest' ? 'primary' : ''"
                  @click="changeStrategy('safest')"
                >
                  最安全
                </el-button>
                <el-button
                  size="small"
                  :type="routeStrategy === 'fastest' ? 'primary' : ''"
                  @click="changeStrategy('fastest')"
                >
                  最快
                </el-button>
              </el-button-group>
              <el-button size="small" @click="calculateRoute" :loading="routeLoading">
                <el-icon><Refresh /></el-icon>
                重新规划
              </el-button>
            </div>
          </div>
        </template>

        <div v-if="routeLoading" class="route-loading">
          <el-skeleton :rows="3" animated />
          <div class="loading-tip">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>正在计算沿道路的最优飞行路径...</span>
          </div>
        </div>

        <div v-else-if="routeResult" class="route-preview">
          <el-row :gutter="16">
            <el-col :span="16">
              <div class="map-section">
                <MapContainer
                  :markers="routeMarkers"
                  :route="routePoints"
                  :show-toolbar="true"
                  :coord-type="coordType"
                />
                <div class="map-legend">
                  <div class="legend-item">
                    <div class="legend-color" style="background: #1890ff;"></div>
                    <span>飞行路径（沿道路正上方）</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color" style="background: #52c41a;"></div>
                    <span>起点</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color" style="background: #ff4d4f;"></div>
                    <span>终点</span>
                  </div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="route-info">
                <el-descriptions :column="1" border>
                <el-descriptions-item label="路径距离">
                  <span class="info-value">{{ (routeResult.distance ?? 0).toFixed(2) }} 公里</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="预计时长">
                  <span class="info-value">{{ formatDuration(routeResult.duration ?? 0) }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="路径点数">
                    <span class="info-value">{{ routeResult.points.length }} 个</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="风险系数" v-if="routeResult.riskFactor !== undefined">
                    <div class="risk-info">
                      <el-progress
                        :percentage="Math.round(routeResult.riskFactor * 100)"
                        :color="getRiskColor(routeResult.riskFactor)"
                        :format="(val) => `${(val / 100).toFixed(2)}`"
                      />
                      <span class="risk-text" :style="{ color: getRiskColor(routeResult.riskFactor) }">
                        {{ getRiskText(routeResult.riskFactor) }}
                      </span>
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item label="天气状况" v-if="routeResult.weatherCondition">
                    <el-tag :type="getWeatherTagType(routeResult.weatherCondition)">
                      {{ routeResult.weatherCondition }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="预计电量消耗" v-if="routeResult.estimatedBatteryConsumption">
                    <div class="battery-info">
                      <el-progress
                        :percentage="routeResult.estimatedBatteryConsumption"
                        :color="getBatteryColor(routeResult.estimatedBatteryConsumption)"
                      />
                      <span class="info-value">{{ routeResult.estimatedBatteryConsumption.toFixed(1) }}%</span>
                    </div>
                  </el-descriptions-item>
                </el-descriptions>

                <div v-if="routeResult.warnings && routeResult.warnings.length > 0" class="warnings">
                  <el-divider>路径警告</el-divider>
                  <el-alert
                    v-for="(warning, index) in routeResult.warnings"
                    :key="index"
                    :title="warning"
                    type="warning"
                    :closable="false"
                    style="margin-top: 8px"
                  />
                </div>
              </div>
            </el-col>
          </el-row>
        </div>

        <div v-else class="route-empty">
          <el-empty description="请先选择起点和终点，然后点击重新规划" />
        </div>
      </el-card>

      <!-- 步骤4: 确认提交 -->
      <el-card v-else shadow="hover" class="step-card">
        <template #header>
          <div class="card-header">
            <span>确认提交</span>
          </div>
        </template>
        <el-result icon="success" title="任务信息确认" sub-title="请确认以下信息后提交审核">
          <template #extra>
            <div class="confirm-info">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="任务类型">
                  {{ getTaskTypeText(form.type) }}
                </el-descriptions-item>
                <el-descriptions-item label="优先级">
                  <el-rate v-model="form.priority" disabled :max="5" />
                </el-descriptions-item>
                <el-descriptions-item label="任务描述">
                  {{ form.remarks || '无' }}
                </el-descriptions-item>
                <el-descriptions-item label="起点">
                  {{ search.origin || `${form.origin_lng.toFixed(4)}, ${form.origin_lat.toFixed(4)}` }}
                </el-descriptions-item>
                <el-descriptions-item label="终点">
                  {{ search.dest || `${form.dest_lng.toFixed(4)}, ${form.dest_lat.toFixed(4)}` }}
                </el-descriptions-item>
                <el-descriptions-item label="预计距离" v-if="routeResult">
                  {{ routeResult.distance.toFixed(2) }} 公里
                </el-descriptions-item>
                <el-descriptions-item label="预计时长" v-if="routeResult">
                  {{ formatDuration(routeResult.duration) }}
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </template>
        </el-result>
      </el-card>
    </div>

    <div class="action-bar">
      <el-button v-if="step > 0" @click="prev">上一步</el-button>
      <el-button
        v-if="step === 1"
        type="primary"
        @click="handleNext"
        :disabled="!form.origin_lat || !form.dest_lat"
      >
        下一步
      </el-button>
      <el-button
        v-else-if="step === 2"
        type="primary"
        @click="handleNext"
        :disabled="!routeResult"
      >
        下一步
      </el-button>
      <el-button
        v-else-if="step === 3"
        type="primary"
        @click="submit"
        :loading="submitting"
      >
        确认提交
      </el-button>
      <el-button v-else type="primary" @click="handleNext">下一步</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 任务创建页面
 * 支持路径规划预览、沿道路正上方飞行路径可视化
 * @author System
 * @date 2025-01
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location, LocationFilled, Refresh, Loading } from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import MapContainer from '@/components/MapContainer.vue'
import { createTask } from '@/api/task'
import { calculateRoute as calculateRouteAPI, type RouteResult, type RouteOptions } from '@/api/route'
import request from '@/utils/request'
import type { DroneMarker, RoutePoint } from '@/types/drone'

const router = useRouter()

const step = ref(0)
const formRef = ref()
const submitting = ref(false)
const routeLoading = ref(false)
const routeResult = ref<RouteResult | null>(null)
const routeStrategy = ref<'shortest' | 'safest' | 'fastest'>('shortest')
const mapRef = ref<any>(null)
const currentLocation = ref<{ lng: number; lat: number; address?: string } | null>(null)
const coordType = ref<'gcj02' | 'wgs84' | 'bd09'>('gcj02')
const locating = ref(false)
const locateHint = ref('')
const originLoading = ref(false)
const destLoading = ref(false)
const tipCache = new Map<string, any[]>()
let originTimer: number | null = null
let destTimer: number | null = null
let amapAutocomplete: any = null
let amapReady: Promise<any> | null = null
const preRouteCache = ref<{ key: string; result: RouteResult } | null>(null)
const preloading = ref(false)
let preloadTimer: number | null = null
const RECENT_KEY = 'taskCreateRecentLocations'
const recentLocations = ref<Array<{ label: string; lng: number; lat: number; ts: number }>>([])
const poiExamples = ['中南大学', '湘雅医院', '长沙火车站', '五一广场', '省人民医院']
const originInputRef = ref()
const destInputRef = ref()

const form = ref({
  type: 'supplies_transport',
  priority: 3,
  remarks: '',
  origin_lat: 0,
  origin_lng: 0,
  dest_lat: 0,
  dest_lng: 0,
  // 新增：任务属性用于智能分配
  taskCategory: 'organ', // organ | patient | doctor | supplies
  weightKg: 1,
  slaMinutes: 60, // 希望完成时限
  considerWeather: true,
  avoidNoFlyZones: true,
})

const selectMode = ref<'origin' | 'dest'>('origin')
const search = ref({ origin: '', dest: '' })
const centerRef = ref<any>(undefined)

const rules = {
  type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

const isSamePoint = (a: { lng: number; lat: number }, b: { lng: number; lat: number }): boolean => {
  return a.lng.toFixed(6) === b.lng.toFixed(6) && a.lat.toFixed(6) === b.lat.toFixed(6)
}

// 标记点
const markers = computed(() => {
  const list: DroneMarker[] = []
  if (form.value.origin_lat) {
    list.push({
      id: 'origin',
      lat: form.value.origin_lat,
      lng: form.value.origin_lng,
      label: '起点',
      status: 'normal'
    })
  }
  if (form.value.dest_lat) {
    list.push({
      id: 'dest',
      lat: form.value.dest_lat,
      lng: form.value.dest_lng,
      label: '终点',
      status: 'warning'
    })
  }
  if (currentLocation.value) {
    const current = { lng: currentLocation.value.lng, lat: currentLocation.value.lat }
    const origin = form.value.origin_lat ? { lng: form.value.origin_lng, lat: form.value.origin_lat } : null
    const dest = form.value.dest_lat ? { lng: form.value.dest_lng, lat: form.value.dest_lat } : null
    const sameAsOrigin = origin && isSamePoint(current, origin)
    const sameAsDest = dest && isSamePoint(current, dest)
    if (!sameAsOrigin && !sameAsDest) {
      list.push({
        id: 'current',
        lat: current.lat,
        lng: current.lng,
        label: '当前位置',
        status: 'flying'
      })
    }
  }
  return list
})

// 路径预览（步骤2显示）
const previewRoute = computed<RoutePoint[]>(() => {
  if (form.value.origin_lat && form.value.dest_lat && routeResult.value) {
    return routeResult.value.points.map(p => ({
      lng: p.lng,
      lat: p.lat,
      altitude: p.altitude
    }))
  }
  return []
})

// 路径点（步骤3显示）
const routePoints = computed<RoutePoint[]>(() => {
  if (routeResult.value) {
    return routeResult.value.points.map(p => ({
      lng: p.lng,
      lat: p.lat,
      altitude: p.altitude
    }))
  }
  return []
})

// 路径标记点（包含起点终点）
const routeMarkers = computed(() => {
  const list: DroneMarker[] = []
  if (form.value.origin_lat) {
    list.push({
      id: 'origin',
      lat: form.value.origin_lat,
      lng: form.value.origin_lng,
      label: '起点',
      status: 'normal'
    })
  }
  if (form.value.dest_lat) {
    list.push({
      id: 'dest',
      lat: form.value.dest_lat,
      lng: form.value.dest_lng,
      label: '终点',
      status: 'warning'
    })
  }
  return list
})

// 监听起点终点变化，自动计算路径（步骤2）并预加载（步骤1）
watch(
  () => [form.value.origin_lat, form.value.origin_lng, form.value.dest_lat, form.value.dest_lng, step.value],
  ([originLat, originLng, destLat, destLng, currentStep]) => {
    if (!originLat || !originLng || !destLat || !destLng) return
    if (currentStep === 2 && !routeLoading.value) {
      calculateRoute({ usePreload: true })
    } else if (currentStep === 1) {
      schedulePreload()
    }
  },
  { deep: true }
)

watch(
  () => [routeStrategy.value, form.value.avoidNoFlyZones, form.value.considerWeather, step.value],
  ([, , , currentStep]) => {
    if (currentStep !== 1) return
    if (form.value.origin_lat && form.value.dest_lat) {
      schedulePreload()
    }
  }
)

const next = () => {
  if (step.value === 1) {
    // 验证起点终点
    if (!form.value.origin_lat || !form.value.dest_lat) {
      ElMessage.warning('请选择起点和终点')
      return
    }
    // 进入路径预览前先计算路径
    calculateRoute({ usePreload: true }).then(() => {
      step.value++
    })
  } else if (step.value === 2) {
    // 验证路径规划结果
    if (!routeResult.value) {
      ElMessage.warning('路径规划失败，请重新规划')
      return
    }
    step.value++
  } else {
    step.value++
  }
}

const prev = () => {
  if (step.value > 0) step.value--
}

const handleNext = () => {
  next()
}

/**
 * 计算路径规划
 */
const buildRouteKey = (): string => {
  if (!form.value.origin_lat || !form.value.dest_lat) return ''
  return [
    form.value.origin_lng.toFixed(6),
    form.value.origin_lat.toFixed(6),
    form.value.dest_lng.toFixed(6),
    form.value.dest_lat.toFixed(6),
    routeStrategy.value,
    form.value.avoidNoFlyZones ? '1' : '0',
    form.value.considerWeather ? '1' : '0'
  ].join('|')
}

const requestRoute = async (): Promise<RouteResult> => {
  const options: RouteOptions = {
    avoidNoFlyZones: form.value.avoidNoFlyZones,
    considerWeather: form.value.considerWeather,
    optimizeStrategy: routeStrategy.value
  }
  return calculateRouteAPI({
    originLng: form.value.origin_lng,
    originLat: form.value.origin_lat,
    destLng: form.value.dest_lng,
    destLat: form.value.dest_lat,
    options
  })
}

const calculateRoute = async (opts: { silent?: boolean; usePreload?: boolean } = {}): Promise<void> => {
  if (!form.value.origin_lat || !form.value.dest_lat) {
    if (!opts.silent) {
      ElMessage.warning('请先选择起点和终点')
    }
    return
  }

  const key = buildRouteKey()
  if (opts.usePreload && key && preRouteCache.value?.key === key) {
    routeResult.value = preRouteCache.value.result
    return
  }

  if (!opts.silent) {
    routeLoading.value = true
  }
  try {
    const result = await requestRoute()
    routeResult.value = result
    if (key) {
      preRouteCache.value = { key, result }
    }
    if (!opts.silent) {
      ElMessage.success('路径规划成功，已生成沿道路正上方的飞行路径')
    }
  } catch (error: any) {
    console.error('Path planning failed:', error)
    if (!opts.silent) {
      ElMessage.error(error?.message || '路径规划失败，请稍后重试')
      routeResult.value = null
    }
  } finally {
    if (!opts.silent) {
      routeLoading.value = false
    }
  }
}

/**
 * 切换路径策略
 */
const changeStrategy = (strategy: 'shortest' | 'safest' | 'fastest'): void => {
  routeStrategy.value = strategy
  calculateRoute()
}

const onLocated = (e: any) => {
  currentLocation.value = { lng: e.lng, lat: e.lat, address: e.address }
  centerRef.value = { lng: e.lng, lat: e.lat }
  locating.value = false
  locateHint.value = '定位成功'
}

const locateNow = (): void => {
  if (!mapRef.value?.locateNow) {
    ElMessage.warning('地图尚未就绪，请稍后再试')
    return
  }
  locateHint.value = '正在提高精度...'
  locating.value = true
  mapRef.value.locateNow()
}

const onLocateError = (message: string): void => {
  locating.value = false
  locateHint.value = message || '定位失败'
  ElMessage.warning(message || '定位失败')
}

const onMapClick = (point: { lng: number; lat: number }): void => {
  if (selectMode.value === 'origin') {
    setOrigin(point, `已选点 ${formatPoint(point)}`)
    selectMode.value = 'dest'
  } else {
    setDest(point, `已选点 ${formatPoint(point)}`)
  }
}

const formatPoint = (p: { lng: number; lat: number }): string => {
  return `${p.lng.toFixed(6)}, ${p.lat.toFixed(6)}`
}

const isValidLngLat = (lng?: number, lat?: number): boolean => {
  if (lng === undefined || lat === undefined) return false
  const nLng = Number(lng)
  const nLat = Number(lat)
  if (!Number.isFinite(nLng) || !Number.isFinite(nLat)) return false
  if (nLng < -180 || nLng > 180 || nLat < -90 || nLat > 90) return false
  return true
}

const setOrigin = (p: { lng: number; lat: number }, label?: string): void => {
  form.value.origin_lng = p.lng
  form.value.origin_lat = p.lat
  centerRef.value = { lng: p.lng, lat: p.lat }
  search.value.origin = label || formatPoint(p)
  addRecentLocation(label || formatPoint(p), p.lng, p.lat)
}

const setDest = (p: { lng: number; lat: number }, label?: string): void => {
  form.value.dest_lng = p.lng
  form.value.dest_lat = p.lat
  centerRef.value = { lng: p.lng, lat: p.lat }
  search.value.dest = label || formatPoint(p)
  addRecentLocation(label || formatPoint(p), p.lng, p.lat)
}

const useCurrentAsOrigin = (): void => {
  if (!currentLocation.value) return
  const label = currentLocation.value.address || '当前位置'
  setOrigin(currentLocation.value, label)
  selectMode.value = 'dest'
}

const useCurrentAsDest = (): void => {
  if (!currentLocation.value) return
  const label = currentLocation.value.address || '当前位置'
  setDest(currentLocation.value, label)
}

const toRad = (val: number) => (val * Math.PI) / 180
const distanceMeters = (a: { lng: number; lat: number }, b: { lng: number; lat: number }) => {
  const r = 6378137
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2)
  return 2 * r * Math.asin(Math.sqrt(h))
}

const getRecentSuggestions = (keyword = '') => {
  return recentLocations.value
    .filter(it => !keyword || it.label.includes(keyword))
    .map(it => ({
      value: it.label,
      name: it.label,
      address: '',
      lng: it.lng,
      lat: it.lat
    }))
}

const ensureAmapLoaded = async (): Promise<any | null> => {
  const AMap = (window as any).AMap
  if (AMap?.Autocomplete) return AMap
  if (!amapReady) {
    const envKey = import.meta.env.VITE_AMAP_KEY
    const envSecurity = import.meta.env.VITE_AMAP_SECURITY
    const config = envKey
      ? { key: envKey, security: envSecurity }
      : await request.get('/route/config').then((cfg: any) => {
          const data = cfg?.data || cfg
          return { key: data?.key || '', security: data?.securityJsCode || '' }
        }).catch(() => ({ key: '', security: '' }))
    if (!config.key) return null
    ;(window as any)._AMapSecurityConfig = { securityJsCode: config.security || '' }
    amapReady = AMapLoader.load({
      key: config.key,
      version: '2.0',
      plugins: ['AMap.Autocomplete', 'AMap.Geocoder']
    })
  }
  try {
    return await amapReady
  } catch {
    return null
  }
}

const ensureAutocomplete = async () => {
  const AMap = await ensureAmapLoaded()
  if (!AMap || !AMap.Autocomplete) return null
  if (!amapAutocomplete) {
    amapAutocomplete = new AMap.Autocomplete({ city: '全国' })
  }
  return amapAutocomplete
}

const fetchTipsFromAMap = async (keyword: string): Promise<any[]> => {
  return new Promise((resolve) => {
    void ensureAutocomplete().then((autocomplete) => {
      if (!autocomplete) return resolve([])
      autocomplete.search(keyword, (status: string, result: any) => {
      if (status !== 'complete' || !Array.isArray(result?.tips)) return resolve([])
      const list = result.tips
        .map((it: any) => {
          const lng = it?.location?.lng
          const lat = it?.location?.lat
          return {
            value: it.name || it.address || '',
            name: it.name,
            address: it.address,
            district: it.district,
            lng,
            lat
          }
        })
        .filter((it: any) => it?.value)
      resolve(list)
      })
    })
  })
}

const geocodeByKeyword = (keyword: string): Promise<{ lng: number; lat: number } | null> => {
  return new Promise((resolve) => {
    void ensureAmapLoaded().then((AMap) => {
      if (!AMap || !AMap.Geocoder) return resolve(null)
      const geocoder = new AMap.Geocoder({ city: '全国' })
      geocoder.getLocation(keyword, (status: string, result: any) => {
        if (status !== 'complete' || !result?.geocodes?.length) return resolve(null)
        const loc = result.geocodes[0].location
        const lng = loc?.getLng?.() ?? loc?.lng
        const lat = loc?.getLat?.() ?? loc?.lat
        if (!isValidLngLat(lng, lat)) return resolve(null)
        resolve({ lng: Number(lng), lat: Number(lat) })
      })
    })
  })
}

const fetchTips = async (q: string, cb: any, loadingRef: { value: boolean }) => {
  const keyword = q.trim()
  if (!keyword || keyword.length < 2) {
    cb(getRecentSuggestions())
    return
  }
  const loc = currentLocation.value
  const cacheKey = `${keyword}:${loc ? `${loc.lng.toFixed(3)},${loc.lat.toFixed(3)}` : 'noloc'}`
  if (tipCache.has(cacheKey)) {
    cb(tipCache.get(cacheKey) || [])
    return
  }
  loadingRef.value = true
  try {
    const params: any = { keywords: keyword }
    if (loc) {
      params.lng = loc.lng
      params.lat = loc.lat
    }
    const res: any = await request.get('/route/tips', { params })
    let list = (res?.data || res || []).map((it: any) => {
      const lng = Number(it.lng)
      const lat = Number(it.lat)
      return {
        value: it.name || it.address || '',
        name: it.name,
        address: it.address,
        district: it.district,
        lng,
        lat
      }
    })
    list = list.filter((it: any) => isValidLngLat(it.lng, it.lat) || it.value)
    if (list.length === 0) {
      const fallback = await fetchTipsFromAMap(keyword)
      list = fallback
    }
    const recentMatched = getRecentSuggestions(keyword)
    list = [...recentMatched, ...list]
    if (loc) {
      list.sort((a: any, b: any) => {
        if (!a.lng || !b.lng) return 0
        return distanceMeters(a, loc) - distanceMeters(b, loc)
      })
    }
    tipCache.set(cacheKey, list)
    cb(list)
  } catch {
    const fallback = await fetchTipsFromAMap(keyword)
    cb(fallback.length ? fallback : getRecentSuggestions(keyword))
  } finally {
    loadingRef.value = false
  }
}

const queryOrigin = (q: string, cb: any) => {
  if (originTimer) window.clearTimeout(originTimer)
  originTimer = window.setTimeout(() => {
    void fetchTips(q, cb, originLoading)
  }, 300)
}

const queryDest = (q: string, cb: any) => {
  if (destTimer) window.clearTimeout(destTimer)
  destTimer = window.setTimeout(() => {
    void fetchTips(q, cb, destLoading)
  }, 300)
}

const onSelectOrigin = (it: any) => {
  const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
  if (isValidLngLat(it.lng, it.lat)) {
    setOrigin({ lng: Number(it.lng), lat: Number(it.lat) }, label)
    selectMode.value = 'dest'
    return
  }
  void geocodeByKeyword(label).then((loc) => {
    if (!loc) {
      ElMessage.warning('未找到该位置的精确坐标')
      return
    }
    setOrigin(loc, label)
    selectMode.value = 'dest'
  })
}

const onSelectDest = (it: any) => {
  const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
  if (isValidLngLat(it.lng, it.lat)) {
    setDest({ lng: Number(it.lng), lat: Number(it.lat) }, label)
    return
  }
  void geocodeByKeyword(label).then((loc) => {
    if (!loc) {
      ElMessage.warning('未找到该位置的精确坐标')
      return
    }
    setDest(loc, label)
  })
}

const applyPoiExample = (keyword: string): void => {
  if (selectMode.value === 'origin') {
    search.value.origin = keyword
    originInputRef.value?.focus?.()
    queryOrigin(keyword, () => {})
  } else {
    search.value.dest = keyword
    destInputRef.value?.focus?.()
    queryDest(keyword, () => {})
  }
}

const schedulePreload = (): void => {
  if (preloadTimer) window.clearTimeout(preloadTimer)
  preloadTimer = window.setTimeout(() => {
    void preloadRoute()
  }, 600)
}

const preloadRoute = async (): Promise<void> => {
  if (!form.value.origin_lat || !form.value.dest_lat) return
  const key = buildRouteKey()
  if (!key || preloading.value || preRouteCache.value?.key === key) return
  preloading.value = true
  try {
    const result = await requestRoute()
    preRouteCache.value = { key, result }
  } catch {
    // ignore
  } finally {
    preloading.value = false
  }
}

const submit = async () => {
  try {
    await formRef.value?.validate()
    
    submitting.value = true
    const payload = {
      type: form.value.type,
      priority: form.value.priority,
      remarks: form.value.remarks,
      origin_lat: form.value.origin_lat,
      origin_lng: form.value.origin_lng,
      dest_lat: form.value.dest_lat,
      dest_lng: form.value.dest_lng,
      requestUserId: 1, // TODO: 从store获取
      auditStatus: 'pending_review',
      routeId: routeResult.value?.routeId,
      taskCategory: form.value.taskCategory,
      weightKg: form.value.weightKg,
      slaMinutes: form.value.slaMinutes,
      considerWeather: form.value.considerWeather,
      avoidNoFlyZones: form.value.avoidNoFlyZones,
      routeOptimizeStrategy: routeStrategy.value
    }
    
    await createTask(payload)
    ElMessage.success('任务已提交，等待审核')
    router.push({ name: 'TaskList' })
  } catch (error: any) {
    if (error !== false) {
      ElMessage.error(error?.message || '提交失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
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

const loadRecentLocations = (): void => {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    recentLocations.value = raw ? JSON.parse(raw) : []
  } catch {
    recentLocations.value = []
  }
}

const persistRecentLocations = (): void => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recentLocations.value))
  } catch {
    // ignore
  }
}

const addRecentLocation = (label: string, lng: number, lat: number): void => {
  const safeLabel = label?.trim()
  if (!safeLabel || !lng || !lat) return
  const key = `${lng.toFixed(6)},${lat.toFixed(6)}`
  const list = recentLocations.value.filter(it => `${it.lng.toFixed(6)},${it.lat.toFixed(6)}` !== key)
  list.unshift({ label: safeLabel, lng, lat, ts: Date.now() })
  recentLocations.value = list.slice(0, 8)
  persistRecentLocations()
}

onMounted(() => {
  loadMapConfig()
  loadRecentLocations()
})

const getTaskTypeText = (type: string): string => {
  const map: Record<string, string> = {
    'supplies_transport': '物资运输',
    'transfer_patient': '患者转运',
    'organ': '器官运输',
    'doctor_dispatch': '医生派遣'
  }
  return map[type] || type
}

const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  }
  return `${minutes}分钟${secs}秒`
}

const getRiskColor = (risk: number): string => {
  if (risk < 0.3) return '#52c41a'
  if (risk < 0.6) return '#faad14'
  return '#ff4d4f'
}

const getRiskText = (risk: number): string => {
  if (risk < 0.3) return '低风险'
  if (risk < 0.6) return '中风险'
  return '高风险'
}

const getBatteryColor = (level: number): string => {
  if (level < 20) return '#ff4d4f'
  if (level < 50) return '#faad14'
  return '#52c41a'
}

const getWeatherTagType = (weather: string): string => {
  if (weather.includes('晴')) return 'success'
  if (weather.includes('雨') || weather.includes('雪')) return 'danger'
  if (weather.includes('云') || weather.includes('阴')) return 'info'
  return ''
}
</script>

<style scoped lang="scss">
.task-create {
  padding: 20px;
  background: transparent;
  min-height: calc(100vh - 60px);
}

.steps {
  margin-bottom: 24px;
  background: rgba(11, 24, 48, 0.9);
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}

.content-wrapper {
  margin-bottom: 24px;
}

.step-card {
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.9), rgba(8, 18, 36, 0.9));
  border: 1px solid rgba(86, 211, 255, 0.18);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #e6f0ff;
}

.search-section {
  margin-bottom: 16px;
}

.locate-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.locate-hint {
  margin-top: 6px;
  color: #8fb3ff;
  font-size: 12px;
}

.ride-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.9), rgba(8, 18, 36, 0.9));
  border: 1px solid rgba(86, 211, 255, 0.18);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
}
.ride-line {
  width: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding-top: 6px;
}
.ride-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.ride-dot.start {
  background: #52c41a;
  box-shadow: 0 0 8px rgba(82, 196, 26, 0.6);
}
.ride-dot.end {
  background: #ff4d4f;
  box-shadow: 0 0 8px rgba(255, 77, 79, 0.6);
}
.ride-rail {
  flex: 1;
  width: 2px;
  background: linear-gradient(180deg, rgba(86, 211, 255, 0.2), rgba(86, 211, 255, 0.6));
  border-radius: 2px;
}
.ride-inputs {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ride-input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(86, 211, 255, 0.2);
  box-shadow: none;
}

.tip-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tip-name {
  color: #1f2d3d;
  font-size: 13px;
  font-weight: 600;
}

.tip-address {
  color: #90a4b8;
  font-size: 12px;
}

.poi-examples {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #8fb3ff;
  font-size: 12px;
}

.poi-label {
  color: #8fb3ff;
}

.poi-tag {
  cursor: pointer;
  border: 1px solid rgba(86, 211, 255, 0.25);
  background: rgba(86, 211, 255, 0.08);
  color: #cfe6ff;
}

.map-section {
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
}

.coordinate-info {
  margin-top: 16px;
}

.text-placeholder {
  color: #9bb3d3;
  font-style: italic;
}

.route-loading {
  padding: 40px;
  text-align: center;
}

.loading-tip {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 20px;
  color: #666;
  font-size: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.map-legend {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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
  color: #666;
}

.legend-color {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.risk-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.risk-text {
  font-size: 12px;
  font-weight: 500;
}

.battery-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.battery-info :deep(.el-progress) {
  flex: 1;
}

.option-flags {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.option-flags :deep(.el-checkbox) {
  margin-right: 8px;
}

.route-preview {
  .route-info {
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
  }

  .info-value {
    font-weight: 600;
    color: #1890ff;
    font-size: 16px;
  }

  .warnings {
    margin-top: 16px;
  }
}

.route-empty {
  padding: 60px 0;
  text-align: center;
}

.confirm-info {
  margin-top: 24px;
  max-width: 600px;
}

.action-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}
</style>
