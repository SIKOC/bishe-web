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
          <el-row :gutter="16">
            <el-col :span="12">
              <el-autocomplete
                v-model="search.origin"
                :fetch-suggestions="queryOrigin"
                placeholder="输入起点，如：市立医院"
                @select="onSelectOrigin"
                clearable
                style="width: 100%"
              >
                <template #prefix>
                  <el-icon><Location /></el-icon>
                </template>
              </el-autocomplete>
            </el-col>
            <el-col :span="12">
              <el-autocomplete
                v-model="search.dest"
                :fetch-suggestions="queryDest"
                placeholder="输入终点，如：中心医院"
                @select="onSelectDest"
                clearable
                style="width: 100%"
              >
                <template #prefix>
                  <el-icon><LocationFilled /></el-icon>
                </template>
              </el-autocomplete>
            </el-col>
          </el-row>
        </div>

        <div class="map-section">
          <MapContainer
            :markers="markers"
            :center="centerRef"
            :route="previewRoute"
            @map-click="onMapClick"
            @located="onLocated"
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
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Location, LocationFilled, Refresh, Loading } from '@element-plus/icons-vue'
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

// 监听起点终点变化，自动计算路径（仅在步骤2时）
watch(
  () => [form.value.origin_lat, form.value.origin_lng, form.value.dest_lat, form.value.dest_lng, step.value],
  ([originLat, originLng, destLat, destLng, currentStep]) => {
    if (originLat && originLng && destLat && destLng && currentStep === 2 && !routeLoading.value) {
      calculateRoute()
    }
  },
  { deep: true }
)

const next = () => {
  if (step.value === 1) {
    // 验证起点终点
    if (!form.value.origin_lat || !form.value.dest_lat) {
      ElMessage.warning('请选择起点和终点')
      return
    }
    // 进入路径预览前先计算路径
    calculateRoute().then(() => {
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
const calculateRoute = async (): Promise<void> => {
  if (!form.value.origin_lat || !form.value.dest_lat) {
    ElMessage.warning('请先选择起点和终点')
    return
  }

  routeLoading.value = true
  try {
  const options: RouteOptions = {
    avoidNoFlyZones: form.value.avoidNoFlyZones,
    considerWeather: form.value.considerWeather,
    optimizeStrategy: routeStrategy.value
  }
    
    const result = await calculateRouteAPI({
      originLng: form.value.origin_lng,
      originLat: form.value.origin_lat,
      destLng: form.value.dest_lng,
      destLat: form.value.dest_lat,
      options
    })
    
    routeResult.value = result
    ElMessage.success('路径规划成功，已生成沿道路正上方的飞行路径')
  } catch (error: any) {
    console.error('Path planning failed:', error)
    ElMessage.error(error?.message || '路径规划失败，请稍后重试')
    routeResult.value = null
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

const onMapClick = (e: any) => {
  if (selectMode.value === 'origin') {
    form.value.origin_lng = e.lng
    form.value.origin_lat = e.lat
    selectMode.value = 'dest'
    ElMessage.success('起点已选择，请选择终点')
  } else {
    form.value.dest_lng = e.lng
    form.value.dest_lat = e.lat
    ElMessage.success('终点已选择')
  }
}

const onLocated = (e: any) => {
  if (!form.value.origin_lat || !form.value.origin_lng) {
    form.value.origin_lng = e.lng
    form.value.origin_lat = e.lat
    centerRef.value = { lng: e.lng, lat: e.lat }
    selectMode.value = 'dest'
  }
}

const queryOrigin = async (q: string, cb: any) => {
  if (!q) return cb([])
  try {
    const res: any = await request.get('/route/tips', { params: { keywords: q } })
    const list = (res?.data || res || []).map((it: any) => ({
      value: `${it.name} ${it.address || ''}`,
      lng: it.lng,
      lat: it.lat
    }))
    cb(list)
  } catch {
    cb([])
  }
}

const queryDest = async (q: string, cb: any) => {
  if (!q) return cb([])
  try {
    const res: any = await request.get('/route/tips', { params: { keywords: q } })
    const list = (res?.data || res || []).map((it: any) => ({
      value: `${it.name} ${it.address || ''}`,
      lng: it.lng,
      lat: it.lat
    }))
    cb(list)
  } catch {
    cb([])
  }
}

const onSelectOrigin = (it: any) => {
  form.value.origin_lng = it.lng
  form.value.origin_lat = it.lat
  centerRef.value = { lng: it.lng, lat: it.lat }
  search.value.origin = it.value
  selectMode.value = 'dest'
}

const onSelectDest = (it: any) => {
  form.value.dest_lng = it.lng
  form.value.dest_lat = it.lat
  centerRef.value = { lng: it.lng, lat: it.lat }
  search.value.dest = it.value
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
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.steps {
  margin-bottom: 24px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.content-wrapper {
  margin-bottom: 24px;
}

.step-card {
  border-radius: 12px;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}

.search-section {
  margin-bottom: 16px;
}

.map-section {
  height: 500px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.coordinate-info {
  margin-top: 16px;
}

.text-placeholder {
  color: #999;
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
