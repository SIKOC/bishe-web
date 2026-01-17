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
          <el-select v-model="query.priority" clearable placeholder="全部优先级" style="width: 150px">
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

      <el-table
        :data="filtered"
        v-loading="loading"
        style="width: 100%"
        :row-class-name="getRowClassName"
        @row-click="handleRowClick"
      >
        <el-table-column prop="id" label="任务ID" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info" size="small">#{{ row.id }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="任务名称" min-width="150">
          <template #default="{ row }">
            <div class="task-name">
              <el-icon><Document /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="getTagType(row.status)" size="small" effect="dark">
              {{ row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优先级" width="120" align="center">
          <template #default="{ row }">
            <el-rate v-model="row.priorityNum" disabled :max="5" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="time" label="创建时间" width="180">
          <template #default="{ row }">
            <span class="time-text">{{ formatTime(row.time) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click.stop="detail(row.id)">
              <el-icon><View /></el-icon>
              详情
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
          </template>
        </el-table-column>
      </el-table>

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
          <el-select v-model="auditForm.originHospitalId" placeholder="选择医院/基地" style="width: 100%">
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Document, View, Check, User, Close } from '@element-plus/icons-vue'
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
  { label: '待审核', value: 'pending' },
  { label: '待调度', value: 'pending' },
  { label: '进行中', value: 'in_progress' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'canceled' }
]

const priorityOptions = [
  { label: '低', value: '1' },
  { label: '中', value: '3' },
  { label: '高', value: '5' }
]

const isAdmin = computed(() => {
  // TODO: 从store获取
  return true
})

const filtered = computed(() => {
  return taskList.value.map(t => ({
    ...t,
    priorityNum: t.priority === '低' ? 1 : t.priority === '中' ? 3 : 5
  }))
})

/**
 * 加载任务列表
 */
const load = async (): Promise<void> => {
  loading.value = true
  try {
    const list = await fetchTaskList({
      page: currentPage.value,
      size: pageSize.value,
      ...query.value
    })
    taskList.value = list
    total.value = list.length // TODO: 从后端获取总数
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
  remark: ''
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
      auditForm.value.originHospitalId
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
      type: 'warning'
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
    '待审核': 'info',
    '待调度': '',
    '进行中': 'warning',
    '飞行中': 'warning',
    '已完成': 'success',
    '已取消': 'danger'
  }
  return typeMap[status] || ''
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
    minute: '2-digit'
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
  load()
})
</script>

<style scoped lang="scss">
.task-list {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.filter-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.filter-form {
  margin: 0;
}

.table-card {
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

.task-name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #333;
  font-weight: 500;
}

.time-text {
  color: #666;
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
