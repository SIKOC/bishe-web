<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
      <p class="page-subtitle">实时监控系统运行状态</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6" v-for="stat in statsList" :key="stat.key">
        <el-card shadow="hover" class="stat-card" :class="stat.type">
          <div class="stat-content">
            <div class="stat-icon-wrapper">
              <el-icon :size="40" :color="stat.iconColor">
                <component :is="stat.icon" />
              </el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ stat.value }}</div>
              <div class="stat-label">{{ stat.label }}</div>
            </div>
            <div class="stat-trend" v-if="stat.trend">
              <el-icon :size="16" :color="stat.trend > 0 ? '#52c41a' : '#ff4d4f'">
                <ArrowUp v-if="stat.trend > 0" />
                <ArrowDown v-else />
              </el-icon>
              <span :style="{ color: stat.trend > 0 ? '#52c41a' : '#ff4d4f' }">
                {{ Math.abs(stat.trend) }}%
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表和地图 -->
    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>近24小时任务并发量</span>
              <el-button-group size="small">
                <el-button :type="chartType === 'line' ? 'primary' : ''" @click="chartType = 'line'">
                  折线图
                </el-button>
                <el-button :type="chartType === 'bar' ? 'primary' : ''" @click="chartType = 'bar'">
                  柱状图
                </el-button>
              </el-button-group>
            </div>
          </template>
          <ChartLine v-if="chartType === 'line'" :x="concurrent.x" :y="concurrent.y" />
          <ChartBar v-else :x="concurrent.x" :y="concurrent.y" />
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="map-card">
          <template #header>
            <div class="card-header">
              <span>实时位置概览</span>
              <el-button size="small" text @click="refreshMap">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </div>
          </template>
          <div class="map-container">
            <MapContainer :markers="markers" :show-toolbar="false" />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 待办事项和消息 -->
    <el-row :gutter="20" class="content-row">
      <el-col :span="12">
        <el-card shadow="hover" class="todo-card">
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
              <el-badge :value="todos.length" :hidden="todos.length === 0">
                <el-button size="small" text @click="showAllTodos">
                  <el-icon><More /></el-icon>
                </el-button>
              </el-badge>
            </div>
          </template>
          <el-scrollbar height="300px">
            <el-timeline>
              <el-timeline-item
                v-for="(todo, index) in todos"
                :key="index"
                :timestamp="todo.time"
                :type="todo.type"
                placement="top"
              >
                <div class="todo-content">
                  <div class="todo-title">{{ todo.title }}</div>
                  <div class="todo-desc" v-if="todo.desc">{{ todo.desc }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-if="todos.length === 0" description="暂无待办事项" :image-size="80" />
          </el-scrollbar>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card shadow="hover" class="message-card">
          <template #header>
            <div class="card-header">
              <span>消息提醒</span>
              <el-badge :value="messages.length" :hidden="messages.length === 0">
                <el-button size="small" text @click="clearMessages">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </el-badge>
            </div>
          </template>
          <el-scrollbar height="300px">
            <div v-if="messages.length === 0" class="empty-message">
              <el-empty description="暂无消息" :image-size="80" />
            </div>
            <div v-else class="message-list">
              <div
                v-for="(msg, index) in messages"
                :key="index"
                class="message-item"
                :class="msg.type"
              >
                <el-icon class="message-icon">
                  <component :is="getMessageIcon(msg.type)" />
                </el-icon>
                <div class="message-content">
                  <div class="message-title">{{ msg.title }}</div>
                  <div class="message-time">{{ formatTime(msg.time) }}</div>
                </div>
              </div>
            </div>
          </el-scrollbar>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
/**
 * 仪表盘页面
 * 显示系统统计、图表、地图、待办事项
 * @author System
 * @date 2025-01
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document,
  MapLocation,
  WarningFilled,
  Coin,
  ArrowUp,
  ArrowDown,
  Refresh,
  More,
  Delete,
  Bell,
  SuccessFilled,
  InfoFilled
} from '@element-plus/icons-vue'
import StatsCard from '@/components/StatsCard.vue'
import MapContainer from '@/components/MapContainer.vue'
import ChartLine from '@/components/ChartLine.vue'
import ChartBar from '@/views/Analytics/components/ChartBar.vue'
import { fetchDashboardStats, fetchConcurrent24h } from '@/api/dashboard'
import { useLivePositions } from '@/hooks/useLivePositions'

const stats = ref({ waybills: 0, online: 0, alerts: 0, mileage: 0 })
const concurrent = ref<{ x: string[]; y: number[] }>({ x: [], y: [] })
const chartType = ref<'line' | 'bar'>('line')

const todos = ref([
  { time: '09:00', title: '检查#03无人机电池', desc: '电池电量低于30%，需要检查', type: 'warning' },
  { time: '10:30', title: '审核新任务申请', desc: '有3个新任务等待审核', type: 'primary' },
  { time: '14:00', title: '维护记录更新', desc: '更新#05无人机的维护记录', type: 'success' }
])

const messages = ref([
  { type: 'warning', title: '无人机#03电量告急', time: Date.now() - 300000 },
  { type: 'success', title: '任务#123已完成', time: Date.now() - 600000 }
])

const { markers, start, stop, refresh } = useLivePositions({
  enablePolling: true,
  pollInterval: 3000
})

const statsList = computed(() => [
  {
    key: 'tasks',
    label: '进行中任务',
    value: stats.value.waybills,
    icon: Document,
    iconColor: '#1890ff',
    type: 'primary',
    trend: 12
  },
  {
    key: 'drones',
    label: '在线无人机',
    value: stats.value.online,
    icon: MapLocation,
    iconColor: '#52c41a',
    type: 'success',
    trend: 5
  },
  {
    key: 'alerts',
    label: '异常告警',
    value: stats.value.alerts,
    icon: WarningFilled,
    iconColor: '#faad14',
    type: 'warning',
    trend: -8
  },
  {
    key: 'mileage',
    label: '累计里程',
    value: `${(stats.value.mileage / 1000).toFixed(1)}K`,
    icon: Coin,
    iconColor: '#722ed1',
    type: 'info',
    trend: 15
  }
])

/**
 * 刷新地图
 */
const refreshMap = (): void => {
  refresh()
  ElMessage.success('已刷新')
}

/**
 * 显示所有待办
 */
const showAllTodos = (): void => {
  // TODO: 跳转到待办事项页面
  ElMessage.info('待办事项功能开发中')
}

/**
 * 清空消息
 */
const clearMessages = (): void => {
  messages.value = []
  ElMessage.success('已清空消息')
}

/**
 * 获取消息图标
 */
const getMessageIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    warning: WarningFilled,
    success: SuccessFilled,
    info: InfoFilled
  }
  return iconMap[type] || Bell
}

/**
 * 格式化时间
 */
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - timestamp
  const minutes = Math.floor(diff / 60000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}小时前`
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  stats.value = await fetchDashboardStats()
  concurrent.value = await fetchConcurrent24h()
  start()
})

onBeforeUnmount(() => {
  stop()
})
</script>

<style scoped lang="scss">
.dashboard {
  padding: 24px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  margin-bottom: 24px;
  
  .page-title {
    font-size: 32px;
    font-weight: 700;
    color: #333;
    margin: 0 0 8px 0;
  }
  
  .page-subtitle {
    font-size: 14px;
    color: #666;
    margin: 0;
  }
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
  
  &.primary {
    border-color: rgba(24, 144, 255, 0.3);
    background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  }
  
  &.success {
    border-color: rgba(82, 196, 26, 0.3);
    background: linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%);
  }
  
  &.warning {
    border-color: rgba(250, 173, 20, 0.3);
    background: linear-gradient(135deg, #fffbe6 0%, #ffe58f 100%);
  }
  
  &.info {
    border-color: rgba(114, 46, 209, 0.3);
    background: linear-gradient(135deg, #f9f0ff 0%, #efdbff 100%);
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
}

.stat-icon-wrapper {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 16px;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 36px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
}

.content-row {
  margin-bottom: 24px;
}

.chart-card,
.map-card,
.todo-card,
.message-card {
  border-radius: 12px;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
}

.map-container {
  height: 400px;
  border-radius: 8px;
  overflow: hidden;
}

.todo-content {
  .todo-title {
    font-weight: 500;
    color: #333;
    margin-bottom: 4px;
  }
  
  .todo-desc {
    font-size: 12px;
    color: #666;
  }
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid transparent;
  transition: all 0.3s;
  
  &:hover {
    background: #f0f0f0;
  }
  
  &.warning {
    border-left-color: #faad14;
  }
  
  &.success {
    border-left-color: #52c41a;
  }
  
  &.info {
    border-left-color: #1890ff;
  }
}

.message-icon {
  margin-top: 2px;
}

.message-content {
  flex: 1;
}

.message-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.message-time {
  font-size: 12px;
  color: #999;
}

.empty-message {
  padding: 60px 0;
}
</style>
