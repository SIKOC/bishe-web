<template>
  <div class="task-create">
    <el-page-header @back="$router.back()" style="margin-bottom: 20px">
      <template #content>
        <span class="text-large font-600">创建医疗任务</span>
      </template>
    </el-page-header>

    <el-steps :active="step" finish-status="success" align-center class="steps">
      <el-step title="基本信息" @click="goStep(0)" />
      <el-step title="位置选择" @click="goStep(1)" />
      <el-step title="路径预览" @click="goStep(2)" />
      <el-step title="确认提交" @click="goStep(3)" />
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
                @keyup.enter.native="onEnterOrigin"
                @blur="onBlurOrigin"
                clearable
                style="width: 100%"
                class="ride-input"
              >
                <template #prefix>
                  <el-icon><Location /></el-icon>
                </template>
                <template #suffix>
                  <el-icon v-if="originResolving"><Loading /></el-icon>
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
                @keyup.enter.native="onEnterDest"
                @blur="onBlurDest"
                clearable
                style="width: 100%"
                class="ride-input"
              >
                <template #prefix>
                  <el-icon><LocationFilled /></el-icon>
                </template>
                <template #suffix>
                  <el-icon v-if="destResolving"><Loading /></el-icon>
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
            <el-button
              size="small"
              type="primary"
              @click="useCurrentAsOrigin"
              :disabled="!currentLocation"
            >
              当前位置设为起点
            </el-button>
            <el-button
              size="small"
              type="success"
              @click="useCurrentAsDest"
              :disabled="!currentLocation"
            >
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
              <el-button size="small" @click="calculateRouteAsync" :loading="routeLoading">
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
                  :key="`route-${routeResult?.routeId || 'init'}`"
                  :markers="routeMarkers"
                  :route="routePoints"
                  :center="routeMapCenter"
                  :show-toolbar="true"
                  :coord-type="coordType"
                  ref="routeMapRef"
                />
                <div class="map-legend">
                  <div class="legend-item">
                    <div class="legend-color" style="background: #1890ff"></div>
                    <span>飞行路径（沿道路正上方）</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color" style="background: #52c41a"></div>
                    <span>起点</span>
                  </div>
                  <div class="legend-item">
                    <div class="legend-color" style="background: #ff4d4f"></div>
                    <span>终点</span>
                  </div>
                </div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="route-info">
                <el-descriptions :column="1" border>
                  <el-descriptions-item label="路径距离">
                    <span class="info-value"
                      >{{ (routeResult.distance ?? 0).toFixed(2) }} 公里</span
                    >
                  </el-descriptions-item>
                  <el-descriptions-item label="预计时长">
                    <span class="info-value">{{ formatDuration(routeResult.duration ?? 0) }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="路径点数">
                    <span class="info-value">{{ routeResult.points.length }} 个</span>
                  </el-descriptions-item>
                  <el-descriptions-item
                    label="风险系数"
                    v-if="routeResult.riskFactor !== undefined"
                  >
                    <div class="risk-info">
                      <el-progress
                        :percentage="Math.round(routeResult.riskFactor * 100)"
                        :color="getRiskColor(routeResult.riskFactor)"
                        :format="formatRiskValue"
                      />
                      <span
                        class="risk-text"
                        :style="{ color: getRiskColor(routeResult.riskFactor) }"
                      >
                        {{ getRiskText(routeResult.riskFactor) }}
                      </span>
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item label="天气状况" v-if="routeResult.weatherCondition">
                    <el-tag :type="getWeatherTagType(routeResult.weatherCondition)">
                      {{ routeResult.weatherCondition }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item
                    label="预计电量消耗"
                    v-if="routeResult.estimatedBatteryConsumption"
                  >
                    <div class="battery-info">
                      <el-progress
                        :percentage="routeResult.estimatedBatteryConsumption"
                        :color="getBatteryColor(routeResult.estimatedBatteryConsumption)"
                      />
                      <span class="info-value"
                        >{{ routeResult.estimatedBatteryConsumption.toFixed(1) }}%</span
                      >
                    </div>
                  </el-descriptions-item>
                </el-descriptions>

                <div
                  v-if="routeResult.warnings && routeResult.warnings.length > 0"
                  class="warnings"
                >
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
                  {{
                    search.origin || `${form.origin_lng.toFixed(4)}, ${form.origin_lat.toFixed(4)}`
                  }}
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
      <el-button v-else-if="step === 2" type="primary" @click="handleNext" :disabled="!routeResult">
        下一步
      </el-button>
      <el-button v-else-if="step === 3" type="primary" @click="submit" :loading="submitting">
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
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location, LocationFilled, Refresh, Loading } from '@element-plus/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import MapContainer from '@/components/MapContainer.vue'
import { createTask, updateTaskRoute } from '@/api/task'
import {
  calculateRoute as calculateRouteAPI,
  type RouteResult,
  type RouteOptions,
} from '@/api/route'
import { useWebSocket } from '@/hooks/useWebSocket'
import request from '@/utils/request'
import type { DroneMarker, RoutePoint } from '@/types/drone'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const step = ref(0)
const formRef = ref()
const submitting = ref(false)
const routeLoading = ref(false)
const routeResult = ref<RouteResult | null>(null)
const pendingJobId = ref<string | null>(null)
let wsClient: any = null
const routeStrategy = ref<'shortest' | 'safest' | 'fastest'>('shortest')
const mapRef = ref<any>(null)
const routeMapRef = ref<any>(null)
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
let amapPlaceSearch: any = null
let amapReady: Promise<any> | null = null
const FALLBACK_AMAP_KEY = 'bcf90d031736c84e396e0d6732c01cae'
const FALLBACK_AMAP_SECURITY = 'a2bd6dc7e8ed3d039ff6105cbf9147d9'
const preRouteCache = ref<{ key: string; result: RouteResult } | null>(null)
const preloading = ref(false)
let preloadTimer: number | null = null
const RECENT_KEY = 'taskCreateRecentLocations'
const recentLocations = ref<Array<{ label: string; lng: number; lat: number; ts: number }>>([])
const poiExamples = ['中南大学', '湘雅医院', '长沙火车站', '五一广场', '省人民医院']
const originInputRef = ref()
const destInputRef = ref()
const lastResolved = ref({ origin: '', dest: '' })
const originSuggestions = ref<any[]>([])
const destSuggestions = ref<any[]>([])
const resolvedAliases = ref<{ origin: string[]; dest: string[] }>({ origin: [], dest: [] })
const originResolving = ref(false)
const destResolving = ref(false)
const DEBUG_GEO = true

const debugGeo = (scope: string, data?: any) => {
  if (!DEBUG_GEO) return
  try {
    console.log(`[geo][${scope}]`, data ?? '')
  } catch {}
}

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
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }],
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
      status: 'normal',
    })
  }
  if (form.value.dest_lat) {
    list.push({
      id: 'dest',
      lat: form.value.dest_lat,
      lng: form.value.dest_lng,
      label: '终点',
      status: 'warning',
    })
  }
  if (currentLocation.value) {
    const current = { lng: currentLocation.value.lng, lat: currentLocation.value.lat }
    const origin = form.value.origin_lat
      ? { lng: form.value.origin_lng, lat: form.value.origin_lat }
      : null
    const dest = form.value.dest_lat ? { lng: form.value.dest_lng, lat: form.value.dest_lat } : null
    const sameAsOrigin = origin && isSamePoint(current, origin)
    const sameAsDest = dest && isSamePoint(current, dest)
    if (!sameAsOrigin && !sameAsDest) {
      list.push({
        id: 'current',
        lat: current.lat,
        lng: current.lng,
        label: '当前位置',
        status: 'flying',
      })
    }
  }
  return list
})

// 路径预览（步骤2显示）
const previewRoute = computed<RoutePoint[]>(() => {
  if (form.value.origin_lat && form.value.dest_lat && routeResult.value && routeResult.value.points) {
    return routeResult.value.points.map((p) => ({
      lng: p.lng,
      lat: p.lat,
      altitude: p.altitude,
    }))
  }
  return []
})

// 路径点（步骤3显示）
const routePoints = computed<RoutePoint[]>(() => {
  if (routeResult.value && routeResult.value.points && Array.isArray(routeResult.value.points)) {
    return routeResult.value.points.map((p) => ({
      lng: p.lng,
      lat: p.lat,
      altitude: p.altitude,
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
      status: 'normal',
    })
  }
  if (form.value.dest_lat) {
    list.push({
      id: 'dest',
      lat: form.value.dest_lat,
      lng: form.value.dest_lng,
      label: '终点',
      status: 'warning',
    })
  }
  return list
})

// 路径预览地图中心（起终点中点，避免默认定位到上海）
const routeMapCenter = computed(() => {
  if (form.value.origin_lat && form.value.dest_lat) {
    return {
      lng: (form.value.origin_lng + form.value.dest_lng) / 2,
      lat: (form.value.origin_lat + form.value.dest_lat) / 2,
    }
  }
  return undefined
})

// 监听起点终点变化，自动计算路径（步骤2）并预加载（步骤1）
watch(
  () => [
    form.value.origin_lat,
    form.value.origin_lng,
    form.value.dest_lat,
    form.value.dest_lng,
    step.value,
  ],
  ([originLat, originLng, destLat, destLng, currentStep]) => {
    if (!originLat || !originLng || !destLat || !destLng) return
    if (currentStep === 2 && !routeLoading.value) {
      calculateRoute({ usePreload: true })
    } else if (currentStep === 1) {
      schedulePreload()
    }
  },
  { deep: true },
)

watch(
  () => search.value.origin,
  (val: string) => {
    if (originResolving.value) return
    const clean = (val || '').trim()
    const aliases = resolvedAliases.value.origin || []
    if (!clean) {
      form.value.origin_lat = 0
      form.value.origin_lng = 0
      return
    }
    if (aliases.length > 0 && isAliasMatch(clean, aliases)) return
    if (originSuggestions.value.length > 0) {
      const matched = originSuggestions.value.some((it: any) => {
        const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
        return isAliasMatch(clean, [label, it.name, it.value].filter(Boolean).map(String))
      })
      if (matched) return
    }
    // 仅在失焦/回车时做最终清空，避免输入过程误清除坐标
  },
)

watch(
  () => search.value.dest,
  (val: string) => {
    if (destResolving.value) return
    const clean = (val || '').trim()
    const aliases = resolvedAliases.value.dest || []
    if (!clean) {
      debugGeo('dest.clear.empty', { input: val })
      form.value.dest_lat = 0
      form.value.dest_lng = 0
      return
    }
    if (lastResolved.value.dest === clean && form.value.dest_lat && form.value.dest_lng) {
      return
    }
    if (aliases.length > 0 && isAliasMatch(clean, aliases)) return
    if (destSuggestions.value.length > 0) {
      const matched = destSuggestions.value.some((it: any) => {
        const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
        return isAliasMatch(clean, [label, it.name, it.value].filter(Boolean).map(String))
      })
      if (matched) return
    }
    debugGeo('dest.pending.mismatch', { input: clean, aliases })
    // 仅在失焦/回车时做最终清空，避免输入过程误清除坐标
  },
)

watch(
  () => [routeStrategy.value, form.value.avoidNoFlyZones, form.value.considerWeather, step.value],
  ([, , , currentStep]) => {
    if (currentStep !== 1) return
    if (form.value.origin_lat && form.value.dest_lat) {
      schedulePreload()
    }
  },
)

watch(
  () => [routeResult.value, step.value],
  ([result, currentStep]) => {
    if (currentStep !== 2 || !result) return
    mapRef.value?.refreshRoute?.(true)
  },
  { deep: true },
)

watch(
  () => [routeResult.value, step.value],
  ([result, currentStep]) => {
    if (currentStep !== 2 || !result) return
    nextTick(() => {
      routeMapRef.value?.refreshRoute?.(true)
    })
  },
  { deep: true },
)

watch(
  () => step.value,
  (currentStep) => {
    if (currentStep !== 1) return
    nextTick(() => {
      mapRef.value?.refreshRoute?.(true)
    })
  },
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

const goStep = (target: number) => {
  if (target >= step.value) return
  step.value = target
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
    form.value.considerWeather ? '1' : '0',
  ].join('|')
}

const requestRoute = async (): Promise<RouteResult> => {
  const options: RouteOptions = {
    avoidNoFlyZones: form.value.avoidNoFlyZones,
    considerWeather: form.value.considerWeather,
    optimizeStrategy: routeStrategy.value,
  }
  return calculateRouteAPI({
    originLng: form.value.origin_lng,
    originLat: form.value.origin_lat,
    destLng: form.value.dest_lng,
    destLat: form.value.dest_lat,
    options,
  })
}

const calculateRoute = async (
  opts: { silent?: boolean; usePreload?: boolean } = {},
): Promise<void> => {
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
    // 若后端返回 jobId (async accepted)
    if ((result as any)?.jobId) {
      pendingJobId.value = (result as any).jobId
      // subscribe websocket to listen for job_result
      if (wsClient && typeof wsClient.connect === 'function') wsClient.connect()
      ElMessage.info('路径已提交后台计算，高质量结果稍后推送')
      return
    }
    routeResult.value = result as RouteResult
    console.log('TaskCreate: Route calculated:', routeResult.value)
    if (key) {
      preRouteCache.value = { key, result }
    }
    if (!opts.silent) {
      ElMessage.success('路径规划成功，已生成沿道路正上方的飞行路径')
    }
  } catch (error: any) {
    console.error('Path planning failed:', error)
    // 前端兜底：即使后端失败，也构造一个临时的直线路径结果，确保用户能继续操作
    const fallbackPoints = [
      { lng: form.value.origin_lng, lat: form.value.origin_lat, altitude: 100 },
      { lng: form.value.dest_lng, lat: form.value.dest_lat, altitude: 100 }
    ]
    // 简单的距离计算
    const R = 6371
    const dLat = (form.value.dest_lat - form.value.origin_lat) * Math.PI / 180
    const dLon = (form.value.dest_lng - form.value.origin_lng) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(form.value.origin_lat * Math.PI / 180) * Math.cos(form.value.dest_lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const dist = R * c

    routeResult.value = {
      points: fallbackPoints,
      distance: dist,
      duration: dist / 60 * 3600, // 假设 60km/h
      riskFactor: 0.1,
      estimatedBatteryConsumption: 10,
      warnings: ['后端服务暂不可用，已切换为本地估算路径', ...(error?.message ? [error.message] : [])],
      routeId: 'fallback_' + Date.now()
    } as any

    if (!opts.silent) {
      ElMessage.warning('后端规划服务异常，已启用本地路径估算')
    }
  } finally {
    if (!opts.silent) {
      routeLoading.value = false
    }
  }
}

/** 异步请求高质量路径（后台计算并推送） */
const calculateRouteAsync = async (): Promise<void> => {
  try {
    routeLoading.value = true
    const payload = {
      originLng: form.value.origin_lng,
      originLat: form.value.origin_lat,
      destLng: form.value.dest_lng,
      destLat: form.value.dest_lat,
      options: {
        avoidNoFlyZones: form.value.avoidNoFlyZones,
        considerWeather: form.value.considerWeather,
        optimizeStrategy: routeStrategy.value,
      },
      async: true,
    }
    const res: any = await calculateRouteAPI(payload)
    if (res && res.jobId) {
      pendingJobId.value = res.jobId
      if (wsClient && typeof wsClient.connect === 'function') wsClient.connect()
      ElMessage.info('已开始后台路径计算，稍后将收到高质量结果')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '异步路径提交失败')
  } finally {
    routeLoading.value = false
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

// WebSocket for job results
const wsBase = import.meta.env.VITE_NETTY_WS_BASE || 'ws://localhost:18080'
const wsJobsUrl = `${wsBase}/ws/route/jobs`
onMounted(() => {
  try {
    wsClient = useWebSocket({
      url: wsJobsUrl,
      autoReconnect: true,
      getToken: () => localStorage.getItem('access_token'),
      onOpen: () => {
        // nothing
      },
      onClose: () => {},
    })
    wsClient.handleMessage = (msg: any) => {
      if (!msg || !msg.type) return
      if (msg.type === 'job_result') {
        const jobId = msg.jobId || msg.data?.jobId
        if (!jobId || jobId !== pendingJobId.value) return
        const status = msg.status || msg.data?.status
        if (status === 'success') {
          const result = msg.result || msg.data?.result
          if (result) {
            routeResult.value = result
            // cache routeId if exists
            if (result.routeId) {
              form.value.route_id = result.routeId
            }
            ElMessage.success('高质量路径已生成并已更新预览')
            pendingJobId.value = null
            try { wsClient.disconnect() } catch {}
          }
        } else {
          ElMessage.error('路径计算失败：' + (msg.error || '未知错误'))
          pendingJobId.value = null
          try { wsClient.disconnect() } catch {}
        }
      }
    }
  } catch (e) {}
})

onBeforeUnmount(() => {
  try { wsClient?.disconnect() } catch {}
})

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

const normalizeLngLat = (p: { lng: number; lat: number }) => {
  const lng = Number(p?.lng)
  const lat = Number(p?.lat)
  if (!isValidLngLat(lng, lat)) return null
  return { lng, lat }
}

const setOrigin = (p: { lng: number; lat: number }, label?: string): void => {
  const normalized = normalizeLngLat(p)
  if (!normalized) {
    debugGeo('setOrigin.invalid', p)
    return
  }
  const resolvedLabel = label || formatPoint(normalized)
  lastResolved.value.origin = resolvedLabel
  resolvedAliases.value.origin = Array.from(
    new Set(
      [...(resolvedAliases.value.origin || []), resolvedLabel]
        .filter(Boolean)
        .map((v) => String(v).trim()),
    ),
  )
  form.value.origin_lng = normalized.lng
  form.value.origin_lat = normalized.lat
  centerRef.value = { lng: normalized.lng, lat: normalized.lat }
  search.value.origin = resolvedLabel
  addRecentLocation(resolvedLabel, normalized.lng, normalized.lat)
  mapRef.value?.refreshRoute?.(true)
}

const setDest = (p: { lng: number; lat: number }, label?: string): void => {
  const normalized = normalizeLngLat(p)
  if (!normalized) {
    debugGeo('setDest.invalid', p)
    return
  }
  const resolvedLabel = label || formatPoint(normalized)
  lastResolved.value.dest = resolvedLabel
  resolvedAliases.value.dest = Array.from(
    new Set(
      [...(resolvedAliases.value.dest || []), resolvedLabel]
        .filter(Boolean)
        .map((v) => String(v).trim()),
    ),
  )
  form.value.dest_lng = normalized.lng
  form.value.dest_lat = normalized.lat
  centerRef.value = { lng: normalized.lng, lat: normalized.lat }
  search.value.dest = resolvedLabel
  debugGeo('setDest', { label: resolvedLabel, lng: normalized.lng, lat: normalized.lat })
  addRecentLocation(resolvedLabel, normalized.lng, normalized.lat)
  mapRef.value?.refreshRoute?.(true)
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
    .filter((it) => !keyword || it.label.includes(keyword))
    .map((it) => ({
      value: it.label,
      name: it.label,
      address: '',
      lng: it.lng,
      lat: it.lat,
    }))
}

const ensureAmapLoaded = async (): Promise<any | null> => {
  const AMap = (window as any).AMap
  if (AMap?.AutoComplete || AMap?.Autocomplete) return AMap
  if (!amapReady) {
    const envKey = import.meta.env.VITE_AMAP_KEY
    const envSecurity = import.meta.env.VITE_AMAP_SECURITY
    const config = envKey
      ? { key: envKey, security: envSecurity }
      : await request
          .get('/route/config')
          .then((cfg: any) => {
            const data = cfg?.data || cfg
            return { key: data?.key || '', security: data?.securityJsCode || '' }
          })
          .catch(() => ({ key: '', security: '' }))
    if (!config.key) {
      config.key = FALLBACK_AMAP_KEY
      config.security = FALLBACK_AMAP_SECURITY
    }
    if (!config.key) return null
    ;(window as any)._AMapSecurityConfig = { securityJsCode: config.security || '' }
    amapReady = AMapLoader.load({
      key: config.key,
      version: '2.0',
      plugins: ['AMap.AutoComplete', 'AMap.Autocomplete', 'AMap.PlaceSearch', 'AMap.Geocoder'],
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
  const AutoCompleteCtor = AMap?.AutoComplete || AMap?.Autocomplete
  if (!AutoCompleteCtor) return null
  if (!amapAutocomplete) {
    amapAutocomplete = new AutoCompleteCtor({ city: '全国' })
  }
  return amapAutocomplete
}

const ensurePlaceSearch = async (): Promise<{ AMap: any; placeSearch: any } | null> => {
  const AMap = await ensureAmapLoaded()
  if (!AMap || !AMap.PlaceSearch) return null
  if (!amapPlaceSearch) {
    amapPlaceSearch = new AMap.PlaceSearch({ city: '全国', citylimit: false, pageSize: 10 })
  }
  return { AMap, placeSearch: amapPlaceSearch }
}

const fetchTipsFromAMap = async (keyword: string): Promise<any[]> => {
  return new Promise((resolve) => {
    void ensureAutocomplete().then((autocomplete) => {
      if (!autocomplete) return resolve([])
      autocomplete.search(keyword, (status: string, result: any) => {
        if (status !== 'complete' || !Array.isArray(result?.tips)) return resolve([])
        const list = result.tips
          .map((it: any) => {
            const lng = Number(it?.location?.lng)
            const lat = Number(it?.location?.lat)
            return {
              value: it.name || it.address || '',
              name: it.name,
              address: it.address,
              district: it.district,
              id: it.id || it.poiid || it.poid,
              adcode: it.adcode,
              lng,
              lat,
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

const placeSearchByKeyword = (keyword: string): Promise<{ lng: number; lat: number } | null> => {
  return new Promise((resolve) => {
    void ensurePlaceSearch().then((ctx) => {
      if (!ctx) return resolve(null)
      const { AMap, placeSearch } = ctx
      const handleResult = (status: string, result: any) => {
        if (status !== 'complete' || !result?.poiList?.pois?.length) return resolve(null)
        const poi = result.poiList.pois[0]
        const loc = poi?.location
        const lng = loc?.lng ?? loc?.getLng?.()
        const lat = loc?.lat ?? loc?.getLat?.()
        if (!isValidLngLat(lng, lat)) return resolve(null)
        resolve({ lng: Number(lng), lat: Number(lat) })
      }
      const isAddressLike = /[0-9]|省|市|区|县|镇|乡|路|街|道|号|村|楼|园|栋|座|校|院/.test(keyword)
      if (currentLocation.value && !isAddressLike && keyword.length <= 4) {
        const center = new AMap.LngLat(currentLocation.value.lng, currentLocation.value.lat)
        placeSearch.searchNearBy(keyword, center, 50000, handleResult)
        return
      }
      placeSearch.search(keyword, handleResult)
    })
  })
}

const fetchTipsList = async (q: string, loadingRef: { value: boolean }) => {
  const keyword = q.trim()
  if (!keyword) {
    return []
  }
  const loc = currentLocation.value
  const cacheKey = `${keyword}:${loc ? `${loc.lng.toFixed(3)},${loc.lat.toFixed(3)}` : 'noloc'}`
  if (tipCache.has(cacheKey)) {
    return tipCache.get(cacheKey) || []
  }
  loadingRef.value = true
  try {
    let list = await fetchTipsFromAMap(keyword)
    if (list.length === 0) {
      const params: any = { keywords: keyword }
      if (loc) {
        params.lng = loc.lng
        params.lat = loc.lat
      }
      const res: any = await request.get('/route/tips', { params })
      list = (res?.data || res || []).map((it: any) => {
        const lng = Number(it.lng)
        const lat = Number(it.lat)
        return {
          value: it.name || it.address || '',
          name: it.name,
          address: it.address,
          district: it.district,
          lng,
          lat,
        }
      })
      list = list.filter((it: any) => isValidLngLat(it.lng, it.lat) || it.value)
    }
    if (loc) {
      list.sort((a: any, b: any) => {
        if (!a.lng || !b.lng) return 0
        return distanceMeters(a, loc) - distanceMeters(b, loc)
      })
    }
    tipCache.set(cacheKey, list)
    return list
  } catch {
    const fallback = await fetchTipsFromAMap(keyword)
    return fallback
  } finally {
    loadingRef.value = false
  }
}

const resolveKeyword = async (keyword: string): Promise<{ lng: number; lat: number } | null> => {
  const clean = keyword.trim()
  if (!clean) return null
  const loc = await placeSearchByKeyword(clean)
  if (loc) return loc
  return await geocodeByKeyword(clean)
}

const normalizeText = (val?: string): string => {
  return String(val || '')
    .toLowerCase()
    .replace(/[\s\-_,，。()（）【】\[\]、]/g, '')
}

const isAliasMatch = (input: string, aliases: string[]) => {
  const key = normalizeText(input)
  if (!key) return false
  return aliases.some((alias) => {
    const aliasKey = normalizeText(alias)
    if (!aliasKey) return false
    return aliasKey === key || aliasKey.includes(key) || key.includes(aliasKey)
  })
}

const resolveTipLocation = async (tip: any, fallbackKeyword: string) => {
  debugGeo('resolveTipLocation.start', { tip, fallbackKeyword })
  if (isValidLngLat(tip?.lng, tip?.lat)) {
    debugGeo('resolveTipLocation.hitTipCoord', { lng: tip.lng, lat: tip.lat })
    return { lng: Number(tip.lng), lat: Number(tip.lat) }
  }
  if (tip?.id) {
    const ctx = await ensurePlaceSearch()
    if (ctx?.placeSearch?.getDetails) {
      return await new Promise<{ lng: number; lat: number } | null>((resolve) => {
        ctx.placeSearch.getDetails(tip.id, (status: string, result: any) => {
          debugGeo('resolveTipLocation.getDetails', { status, result })
          if (status !== 'complete') return resolve(null)
          const poi = result?.poiList?.pois?.[0]
          const loc = poi?.location
          const lng = loc?.lng ?? loc?.getLng?.()
          const lat = loc?.lat ?? loc?.getLat?.()
          if (!isValidLngLat(lng, lat)) return resolve(null)
          resolve({ lng: Number(lng), lat: Number(lat) })
        })
      })
    }
  }
  const loc = await resolveKeyword(fallbackKeyword)
  debugGeo('resolveTipLocation.fallback', loc)
  return loc
}

const resolveFromSuggestions = async (type: 'origin' | 'dest', keyword?: string) => {
  const clean = (keyword || '').trim()
  if (!clean) return
  if (type === 'origin' && form.value.origin_lat && form.value.origin_lng) {
    const aliases = resolvedAliases.value.origin || []
    if (isAliasMatch(clean, aliases)) return
  }
  if (type === 'dest' && form.value.dest_lat && form.value.dest_lng) {
    const aliases = resolvedAliases.value.dest || []
    if (isAliasMatch(clean, aliases)) return
  }
  if (
    type === 'origin' &&
    lastResolved.value.origin === clean &&
    form.value.origin_lat &&
    form.value.origin_lng
  ) {
    return
  }
  if (
    type === 'dest' &&
    lastResolved.value.dest === clean &&
    form.value.dest_lat &&
    form.value.dest_lng
  ) {
    return
  }
  const loadingRef = type === 'origin' ? originLoading : destLoading
  const list = await fetchTipsList(clean, loadingRef)
  if (type === 'origin') {
    originSuggestions.value = list
  } else {
    destSuggestions.value = list
  }
  const cleanKey = normalizeText(clean)
  const match = list.find((it: any) => {
    const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
    const labelKey = normalizeText(label)
    const nameKey = normalizeText(it.name || it.value)
    return (
      labelKey === cleanKey ||
      nameKey === cleanKey ||
      labelKey.includes(cleanKey) ||
      cleanKey.includes(labelKey)
    )
  })
  if (match) {
    const label =
      `${match.name || match.value || ''} ${match.address || match.district || ''}`.trim()
    const loc = await resolveTipLocation(match, label || clean)
    if (loc) {
      if (type === 'origin') {
        setOrigin(loc, label || clean)
        selectMode.value = 'dest'
      } else {
        setDest(loc, label || clean)
      }
      return
    }
  }
  console.debug('resolveFromSuggestions: no matching tip resolved, attempting fallback geocode', {
    type,
    clean,
  })
  // 没有从提示中解析到坐标，尝试用关键字进行一次地理编码回退（提高用户直接输入地址的容错）
  try {
    const fallbackLoc = await resolveKeyword(clean)
    if (fallbackLoc) {
      if (type === 'origin') {
        setOrigin(fallbackLoc, clean)
        selectMode.value = 'dest'
      } else {
        setDest(fallbackLoc, clean)
      }
      return
    }
  } catch (e) {
    // ignore fallback error
  }

  ElMessage.warning('请从提示列表选择详细地址以确认坐标')
  if (type === 'origin') {
    form.value.origin_lat = 0
    form.value.origin_lng = 0
  } else {
    form.value.dest_lat = 0
    form.value.dest_lng = 0
  }
}

const queryOrigin = (q: string, cb: any) => {
  if (originTimer) window.clearTimeout(originTimer)
  originTimer = window.setTimeout(() => {
    void fetchTipsList(q, originLoading).then((list) => {
      originSuggestions.value = list
      cb(list)
    })
  }, 300)
}

const queryDest = (q: string, cb: any) => {
  if (destTimer) window.clearTimeout(destTimer)
  destTimer = window.setTimeout(() => {
    void fetchTipsList(q, destLoading).then((list) => {
      destSuggestions.value = list
      cb(list)
    })
  }, 300)
}

const onSelectOrigin = (it: any) => {
  const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
  originResolving.value = true
  void resolveTipLocation(it, label)
    .then((loc) => {
      if (!loc) {
        ElMessage.warning('未找到该位置的精确坐标')
        return
      }
      setOrigin(loc, label)
      selectMode.value = 'dest'
    })
    .finally(() => {
      originResolving.value = false
    })
}

const onSelectDest = (it: any) => {
  const label = `${it.name || it.value || ''} ${it.address || it.district || ''}`.trim()
  debugGeo('onSelectDest', { label, item: it })
  destResolving.value = true
  void resolveTipLocation(it, label)
    .then((loc) => {
      if (!loc) {
        debugGeo('onSelectDest.noLocation', { label })
        ElMessage.warning('未找到该位置的精确坐标')
        return
      }
      setDest(loc, label)
      // resolvedAliases 已在 setDest 中维护，避免在解析成功前就写入别名
      debugGeo('onSelectDest.setDest', { label, loc })
    })
    .finally(() => {
      destResolving.value = false
    })
}

const resolveAndSet = async (type: 'origin' | 'dest', keyword?: string) => {
  const clean = (keyword || '').trim()
  if (!clean) return
  if (
    type === 'origin' &&
    lastResolved.value.origin === clean &&
    form.value.origin_lat &&
    form.value.origin_lng
  ) {
    return
  }
  if (
    type === 'dest' &&
    lastResolved.value.dest === clean &&
    form.value.dest_lat &&
    form.value.dest_lng
  ) {
    return
  }
  const loc = await resolveKeyword(clean)
  if (!loc) {
    ElMessage.warning('未找到该位置的精确坐标')
    return
  }
  if (type === 'origin') {
    setOrigin(loc, clean)
    selectMode.value = 'dest'
  } else {
    setDest(loc, clean)
  }
}

const onEnterOrigin = () => {
  if (originResolving.value) return
  if (
    form.value.origin_lat &&
    isAliasMatch((search.value.origin || '').trim(), resolvedAliases.value.origin || [])
  ) {
    return
  }
  void resolveFromSuggestions('origin', search.value.origin)
}

const onEnterDest = () => {
  if (destResolving.value) return
  if (
    form.value.dest_lat &&
    isAliasMatch((search.value.dest || '').trim(), resolvedAliases.value.dest || [])
  ) {
    return
  }
  void resolveFromSuggestions('dest', search.value.dest)
}

const onBlurOrigin = () => {
  if (originResolving.value) return
  if (
    form.value.origin_lat &&
    isAliasMatch((search.value.origin || '').trim(), resolvedAliases.value.origin || [])
  ) {
    return
  }
  void resolveFromSuggestions('origin', search.value.origin)
}

const onBlurDest = () => {
  if (destResolving.value) return
  if (
    form.value.dest_lat &&
    isAliasMatch((search.value.dest || '').trim(), resolvedAliases.value.dest || [])
  ) {
    return
  }
  void resolveFromSuggestions('dest', search.value.dest)
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
      origin_name: search.value.origin || '未知起点',
      dest_name: search.value.dest || '未知终点', // Fixed field name to match backend TaskEntity
      requestUserId: authStore.user?.id || 1, 
      // V7: use snake_case to match backend Entity @JsonProperty
      planned_path_json: routeResult.value?.points ? JSON.stringify(routeResult.value.points) : undefined,
      total_distance_km: routeResult.value?.distance,
      est_time_min: routeResult.value?.duration ? Math.ceil(routeResult.value.duration / 60) : undefined,
      
      taskCategory: form.value.taskCategory,
      weightKg: form.value.weightKg,
      slaMinutes: form.value.slaMinutes,
      considerWeather: form.value.considerWeather,
      avoidNoFlyZones: form.value.avoidNoFlyZones,
      routeOptimizeStrategy: routeStrategy.value,
    }

    const res = await createTask(payload)
    const created = res?.data || res
    const createdId = created?.task_id || created?.taskId || created?.id
    ElMessage.success('任务已提交，等待审核')
    // 如果仍有后台 job 在进行，监听 job_result 将 routeId 关联到任务
    if (pendingJobId.value && createdId) {
      const listener = (msg: any) => {
        if (!msg || msg.type !== 'job_result') return
        const jobId = msg.jobId || msg.data?.jobId
        if (jobId !== pendingJobId.value) return
        const status = msg.status || msg.data?.status
        if (status === 'success') {
          const result = msg.result || msg.data?.result
          // Update task with points
          if (result && result.points) {
            try {
              updateTaskRoute(createdId, result.points)
            } catch {}
          }
        }
        pendingJobId.value = null
        try { wsClient.disconnect() } catch {}
      }
      // attach temporary handler
      const oldHandler = wsClient.handleMessage
      wsClient.handleMessage = (m: any) => {
        try { listener(m) } catch {}
        try { oldHandler?.(m) } catch {}
      }
    }
    // 跳转到任务列表并重置当前创建页状态，避免用户重复提交
    try {
      router.push({ name: 'TaskList' })
    } catch {}
    resetCreateForm()
  } catch (error: any) {
    if (error !== false) {
      ElMessage.error(error?.message || '提交失败，请稍后重试')
    }
  } finally {
    submitting.value = false
  }
}

/**
 * 重置创建任务页面到初始状态
 */
const resetCreateForm = (): void => {
  try {
    // 重置表单验证与字段
    formRef.value?.resetFields?.()
  } catch {}
  // 恢复默认值
  form.value = {
    type: 'supplies_transport',
    priority: 3,
    remarks: '',
    origin_lat: 0,
    origin_lng: 0,
    dest_lat: 0,
    dest_lng: 0,
    taskCategory: 'organ',
    weightKg: 1,
    slaMinutes: 60,
    considerWeather: true,
    avoidNoFlyZones: true,
  }
  // 重置步骤、搜索、路径等状态
  step.value = 0
  routeResult.value = null
  preRouteCache.value = null
  search.value = { origin: '', dest: '' }
  lastResolved.value = { origin: '', dest: '' }
  resolvedAliases.value = { origin: [], dest: [] }
  originSuggestions.value = []
  destSuggestions.value = []
  routeStrategy.value = 'shortest'
  centerRef.value = undefined
  // 触发地图组件刷新（如果需要）
  try {
    mapRef.value?.reset?.()
  } catch {}
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
  const list = recentLocations.value.filter(
    (it) => `${it.lng.toFixed(6)},${it.lat.toFixed(6)}` !== key,
  )
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
    supplies_transport: '物资运输',
    transfer_patient: '患者转运',
    organ: '器官运输',
    doctor_dispatch: '医生派遣',
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

const formatRiskValue = (val: number): string => {
  return `${(val / 100).toFixed(2)}`
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
  position: relative;
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  touch-action: auto;
}

.map-section :deep(.map-wrapper) {
  width: 100%;
  height: 100%;
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
