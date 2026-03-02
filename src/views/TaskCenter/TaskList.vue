<template>
  <div class="task-list">
    <el-page-header @back="$router.back()" style="margin-bottom: 20px">
      <template #content>
        <span class="text-large font-600">任务调度中心</span>
      </template>
    </el-page-header>

    <el-card shadow="hover" class="filter-card">
      <el-form :inline="true" :model="query" class="filter-form">
        <el-form-item label="状态">
          <el-select v-model="query.status" clearable placeholder="全部状态" style="width: 150px">
            <el-option
              v-for="s in statusOptions"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select
            v-model="query.priority"
            clearable
            placeholder="全部优先级"
            style="width: 150px"
          >
            <el-option
              v-for="p in priorityOptions"
              :key="p.value"
              :label="p.label"
              :value="p.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="load" :loading="loading">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <div class="ride-stats">
      <div class="stat-card primary">
        <div class="stat-title">全部任务</div>
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-desc">今日调度总览</div>
      </div>
      <div class="stat-card warning">
        <div class="stat-title">待处理</div>
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-desc">等待审核/调度</div>
      </div>
      <div class="stat-card info">
        <div class="stat-title">进行中</div>
        <div class="stat-value">{{ stats.inProgress }}</div>
        <div class="stat-desc">实时飞行中</div>
      </div>
      <div class="stat-card success">
        <div class="stat-title">已完成</div>
        <div class="stat-value">{{ stats.completed }}</div>
        <div class="stat-desc">本期完成</div>
      </div>
    </div>

    <el-card shadow="hover" class="table-card">
      <template #header>
        <div class="card-header">
          <span>任务列表</span>
          <el-button type="primary" @click="$router.push({ name: 'TaskCreate' })">
            <el-icon><Plus /></el-icon>
            创建任务
          </el-button>
        </div>
      </template>

      <div class="card-grid" v-loading="loading">
        <div
          v-for="row in displayList"
          :key="row.id"
          class="task-card"
          draggable="true"
          @dragstart="onDragStart(row)"
          @dragover.prevent
          @drop="onDrop(row)"
          @click="handleRowClick(row)"
        >
          <div class="status-bubble" :class="getStatusBubbleClass(row.status)">
            {{ row.status }}
          </div>
          <div class="pin-badge" v-if="isPinned(row.id)">置顶</div>
          <div class="card-title">
            <el-icon><Document /></el-icon>
            <span>{{ row.name || `任务#${row.id}` }}</span>
          </div>
          <div class="route-thumb">
            <div class="thumb-dot start"></div>
            <div class="thumb-line"></div>
            <div class="thumb-dot end"></div>
            <div class="thumb-labels">
              <span>{{ row.originName || row.origin_name || '起点' }}</span>
              <span>{{ row.destinationName || row.destination_name || '终点' }}</span>
            </div>
          </div>
          <div class="card-meta">
            <span class="meta-label">任务ID</span>
            <span class="meta-value">#{{ row.id }}</span>
          </div>
          <div class="card-meta">
            <span class="meta-label">创建时间</span>
            <span class="meta-value">{{ formatTime(row.time) }}</span>
          </div>
          <div class="card-meta">
            <span class="meta-label">优先级</span>
            <el-rate v-model="row.priorityNum" disabled :max="5" size="small" />
          </div>
          <div class="card-actions">
            <el-button size="small" @click.stop="detail(row.id)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button size="small" @click.stop="togglePin(row)">
              <el-icon><Top /></el-icon>
              {{ isPinned(row.id) ? '取消置顶' : '置顶' }}
            </el-button>
            <el-button
              v-if="row.status === '待审核' && isAdmin"
              size="small"
              type="primary"
              @click.stop="audit(row)"
            >
              <el-icon><Check /></el-icon>
              审核
            </el-button>
            <el-button
              v-else-if="row.status === '待调度'"
              size="small"
              type="success"
              @click.stop="assign(row)"
            >
              <el-icon><User /></el-icon>
              指派
            </el-button>
            <el-button
              v-if="row.status !== '已完成' && row.status !== '已取消'"
              size="small"
              type="danger"
              @click.stop="cancel(row.id)"
            >
              <el-icon><Close /></el-icon>
              取消
            </el-button>
          </div>
        </div>
      </div>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog v-model="auditVisible" title="任务审核" width="500px">
      <el-form :model="auditForm" label-width="120px">
        <el-form-item label="指派派出方">
          <el-select
            v-model="auditForm.originHospitalId"
            placeholder="选择医院/基地"
            style="width: 100%"
          >
            <el-option
              v-for="hospital in hospitals"
              :key="hospital.hospitalId"
              :label="hospital.name"
              :value="hospital.hospitalId"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="审核结果">
          <el-radio-group v-model="auditForm.auditStatus">
            <el-radio label="approved">通过</el-radio>
            <el-radio label="rejected">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input
            v-model="auditForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入审核意见（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="auditVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAudit" :loading="auditLoading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 任务列表页面
 * 显示所有任务，支持筛选、审核、指派
 * @author System
 * @date 2025-01
 */
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Document,
  View,
  Check,
  User,
  Close,
  Top,
} from '@element-plus/icons-vue'
import { fetchTaskList, auditTask, updateTaskStatus } from '@/api/task'
import request from '@/utils/request'

const router = useRouter()

const loading = ref(false)
const auditLoading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const query = ref<{ status?: string; priority?: string }>({})
const taskList = ref<any[]>([])
const hospitals = ref<any[]>([])

const statusOptions = [
  { label: '待审核', value: 'pending_review' },
  { label: '待调度', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'canceled' },
]

const priorityOptions = [
  { label: '低', value: 1 },
  { label: '中', value: 3 },
  { label: '高', value: 5 },
]

const isAdmin = computed(() => {
  // TODO: 从store获取
  return true
})

const orderIds = ref<number[]>([])
const pinnedIds = ref<number[]>([])
const dragId = ref<number | null>(null)
const storageKey = 'task_list_order_v1'

const filtered = computed(() => {
  return taskList.value.map((t, idx) => ({
    ...t,
    __index: idx,
    priorityNum: typeof t.priority === 'number' ? t.priority : (t.priority === '低' ? 1 : t.priority === '中' ? 3 : 5),
  }))
})

const displayList = computed(() => {
  const list = filtered.value.slice()
  const orderIndex = (id: number) => {
    const idx = orderIds.value.indexOf(id)
    return idx === -1 ? Number.MAX_SAFE_INTEGER : idx
  }
  return list.sort((a, b) => {
    const pa = isPinned(a.id) ? 0 : 1
    const pb = isPinned(b.id) ? 0 : 1
    if (pa !== pb) return pa - pb
    const oa = orderIndex(a.id)
    const ob = orderIndex(b.id)
    if (oa !== ob) return oa - ob
    return (a.__index || 0) - (b.__index || 0)
  })
})

const stats = computed(() => {
  const list = taskList.value
  const pendingSet = new Set(['待审核', '待调度', 'pending'])
  const inProgressSet = new Set(['进行中', '飞行中', 'in_progress'])
  const completedSet = new Set(['已完成', 'completed'])
  return {
    total: list.length,
    pending: list.filter((t) => pendingSet.has(t.status)).length,
    inProgress: list.filter((t) => inProgressSet.has(t.status)).length,
    completed: list.filter((t) => completedSet.has(t.status)).length,
  }
})

/**
 * 加载任务列表
 */
const load = async (): Promise<void> => {
  loading.value = true
  try {
    const res = await fetchTaskList({
      page: currentPage.value,
      size: pageSize.value,
      ...query.value,
    })
    taskList.value = res.list || []
    total.value = res.total || (Array.isArray(res.list) ? res.list.length : 0)
    if (orderIds.value.length === 0) {
      orderIds.value = (res.list || []).map((t: any) => t.id)
    }
  } catch (error) {
    ElMessage.error('加载任务列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

/**
 * 重置查询
 */
const resetQuery = (): void => {
  query.value = {}
  currentPage.value = 1
  load()
}

/**
 * 处理行点击
 */
const handleRowClick = (row: any): void => {
  detail(row.id)
}

const onDragStart = (row: any): void => {
  dragId.value = row.id
}

const onDrop = (row: any): void => {
  if (!dragId.value || dragId.value === row.id) return
  const ids = displayList.value.map((r) => r.id)
  const from = ids.indexOf(dragId.value)
  const to = ids.indexOf(row.id)
  if (from === -1 || to === -1) return
  ids.splice(from, 1)
  ids.splice(to, 0, dragId.value)
  orderIds.value = ids
  dragId.value = null
}

/**
 * 获取行样式
 */
const getRowClassName = ({ row }: { row: any }): string => {
  if (row.status === '进行中') return 'row-warning'
  if (row.status === '已完成') return 'row-success'
  if (row.status === '已取消') return 'row-disabled'
  return ''
}

/**
 * 查看详情
 */
const detail = (id: number): void => {
  router.push({ name: 'TaskDetail', params: { id } })
}

/**
 * 审核任务
 */
const audit = async (row: any): Promise<void> => {
  auditForm.value.id = row.id
  auditForm.value.originHospitalId = row.origin || 1
  auditVisible.value = true

  // 加载医院列表
  if (hospitals.value.length === 0) {
    try {
      const res: any = await request.get('/hospital/list')
      hospitals.value = res?.data?.list || res?.list || []
    } catch (error) {
      console.error('Load hospitals error:', error)
    }
  }
}

const auditVisible = ref(false)
const auditForm = ref({
  id: 0,
  originHospitalId: 1,
  auditStatus: 'approved',
  remark: '',
})

/**
 * 确认审核
 */
const confirmAudit = async (): Promise<void> => {
  auditLoading.value = true
  try {
    await auditTask(
      auditForm.value.id,
      auditForm.value.auditStatus,
      auditForm.value.originHospitalId,
    )
    ElMessage.success('审核完成')
    auditVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error('审核失败')
    console.error(error)
  } finally {
    auditLoading.value = false
  }
}

/**
 * 指派任务
 */
const assign = (row: any): void => {
  router.push({ name: 'TaskDetail', params: { id: row.id } })
}

/**
 * 取消任务
 */
const cancel = async (id: number): Promise<void> => {
  try {
    await ElMessageBox.confirm('确定要取消此任务吗？', '提示', {
      type: 'warning',
    })
    await updateTaskStatus(id, 'canceled')
    ElMessage.success('任务已取消')
    await load()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消任务失败')
      console.error(error)
    }
  }
}

/**
 * 获取标签类型
 */
const getTagType = (status: string): string => {
  const typeMap: Record<string, string> = {
    待审核: 'info',
    待调度: '',
    进行中: 'warning',
    飞行中: 'warning',
    已完成: 'success',
    已取消: 'danger',
  }
  return typeMap[status] || ''
}

const getStatusBubbleClass = (status: string): string => {
  if (status === '已完成') return 'success'
  if (status === '进行中' || status === '飞行中') return 'warning'
  if (status === '已取消') return 'danger'
  return 'info'
}

const togglePin = (row: any): void => {
  const id = row.id
  if (isPinned(id)) {
    pinnedIds.value = pinnedIds.value.filter((v) => v !== id)
  } else {
    pinnedIds.value = [id, ...pinnedIds.value]
  }
}

const isPinned = (id: number): boolean => {
  return pinnedIds.value.includes(id)
}

const loadOrderCache = (): void => {
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return
    const data = JSON.parse(raw)
    if (Array.isArray(data?.orderIds)) orderIds.value = data.orderIds
    if (Array.isArray(data?.pinnedIds)) pinnedIds.value = data.pinnedIds
  } catch {
    // ignore
  }
}

const saveOrderCache = (): void => {
  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        orderIds: orderIds.value,
        pinnedIds: pinnedIds.value,
      }),
    )
  } catch {
    // ignore
  }
}

/**
 * 格式化时间
 */
const formatTime = (timeStr?: string): string => {
  if (!timeStr) return '-'
  const date = new Date(timeStr)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 分页处理
 */
const handleSizeChange = (size: number): void => {
  pageSize.value = size
  currentPage.value = 1
  load()
}

const handleCurrentChange = (page: number): void => {
  currentPage.value = page
  load()
}

onMounted(() => {
  loadOrderCache()
  load()
})

watch(
  [orderIds, pinnedIds],
  () => {
    saveOrderCache()
  },
  { deep: true },
)
</script>

<style scoped lang="scss">
.task-list {
  padding: 20px;
  background: transparent;
  min-height: calc(100vh - 60px);
}

.filter-card {
  margin-bottom: 20px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.9), rgba(8, 18, 36, 0.9));
  border: 1px solid rgba(86, 211, 255, 0.18);
}

.filter-form {
  margin: 0;
}

.ride-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}
.stat-card {
  padding: 16px;
  border-radius: 14px;
  border: 1px solid rgba(86, 211, 255, 0.18);
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.9), rgba(8, 18, 36, 0.9));
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.stat-title {
  color: #9bb3d3;
  font-size: 12px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #e6f0ff;
  margin: 6px 0;
}
.stat-desc {
  color: #6f89ab;
  font-size: 12px;
}
.stat-card.primary {
  border-color: rgba(86, 211, 255, 0.35);
}
.stat-card.warning {
  border-color: rgba(250, 173, 20, 0.35);
}
.stat-card.info {
  border-color: rgba(24, 144, 255, 0.35);
}
.stat-card.success {
  border-color: rgba(82, 196, 26, 0.35);
}

.table-card {
  border-radius: 12px;
  overflow: hidden;
}

.card-grid {
  column-count: 3;
  column-gap: 16px;
}
.task-card {
  break-inside: avoid;
  margin: 0 0 16px;
  padding: 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(11, 24, 48, 0.95), rgba(8, 18, 36, 0.95));
  border: 1px solid rgba(86, 211, 255, 0.18);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  position: relative;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}
.status-bubble {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  color: #e6f0ff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
}
.status-bubble.success {
  background: rgba(82, 196, 26, 0.18);
  border-color: rgba(82, 196, 26, 0.5);
}
.status-bubble.warning {
  background: rgba(250, 173, 20, 0.18);
  border-color: rgba(250, 173, 20, 0.5);
}
.status-bubble.danger {
  background: rgba(255, 77, 79, 0.18);
  border-color: rgba(255, 77, 79, 0.5);
}
.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6f0ff;
  font-weight: 600;
  margin-bottom: 12px;
}
.pin-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  padding: 2px 8px;
  font-size: 11px;
  color: #56d3ff;
  background: rgba(86, 211, 255, 0.12);
  border: 1px solid rgba(86, 211, 255, 0.35);
  border-radius: 999px;
}
.route-thumb {
  position: relative;
  padding: 10px 8px 10px 20px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: rgba(86, 211, 255, 0.06);
  border: 1px dashed rgba(86, 211, 255, 0.25);
}
.thumb-line {
  position: absolute;
  left: 12px;
  top: 10px;
  bottom: 10px;
  width: 2px;
  background: linear-gradient(180deg, rgba(82, 196, 26, 0.6), rgba(255, 77, 79, 0.8));
}
.thumb-dot {
  position: absolute;
  left: 7px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.thumb-dot.start {
  top: 8px;
  background: #52c41a;
}
.thumb-dot.end {
  bottom: 8px;
  background: #ff4d4f;
}
.thumb-labels {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
  color: #9bb3d3;
}
.card-meta {
  display: flex;
  justify-content: space-between;
  color: #9bb3d3;
  font-size: 12px;
  margin-bottom: 8px;
}
.card-meta .meta-value {
  color: #e6f0ff;
  font-weight: 500;
}
.card-actions {
  margin-top: 10px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #e6f0ff;
}

.task-name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e6f0ff;
  font-weight: 500;
}

.time-text {
  color: #9bb3d3;
  font-size: 13px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.row-warning) {
  background-color: #fff7e6;

  &:hover {
    background-color: #ffe7ba !important;
  }
}

:deep(.row-success) {
  background-color: #f6ffed;

  &:hover {
    background-color: #d9f7be !important;
  }
}

:deep(.row-disabled) {
  background-color: #fafafa;
  opacity: 0.7;
}
</style>
