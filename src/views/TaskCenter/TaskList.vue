<template>
  <el-card>
    <template #header>任务列表</template>
    <el-form :inline="true" :model="query">
      <el-form-item label="状态"
        ><el-select v-model="query.status" clearable
          ><el-option v-for="s in statuses" :key="s" :label="s" :value="s" /></el-select
      ></el-form-item>
      <el-form-item label="优先级"
        ><el-select v-model="query.priority" clearable
          ><el-option v-for="p in priorities" :key="p" :label="p" :value="p" /></el-select
      ></el-form-item>
      <el-form-item><el-button type="primary" @click="load">查询</el-button></el-form-item>
    </el-form>

    <el-table :data="filtered" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="任务" />
      <el-table-column label="状态" width="120">
        <template #default="{ row }"
          ><el-tag :type="tagType(row.status)">{{ row.status }}</el-tag></template
        >
      </el-table-column>
      <el-table-column prop="priority" label="优先级" width="100" />
      <el-table-column prop="time" label="时间" width="160" />
      <el-table-column label="操作" width="240">
        <template #default="{ row }">
          <el-button size="small" @click="detail(row.id)">详情</el-button>
          <el-button size="small" type="warning">取消</el-button>
          <el-button size="small" type="danger" @click="intervene(row.id)">强制人工干预</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useTaskStore } from '@/store/task'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

const router = useRouter()
const task = useTaskStore()
const loading = computed(() => task.loading)
const statuses = ['待调度', '飞行中', '已完成', '异常']
const priorities = ['低', '中', '高']
const query = ref<{ status?: string; priority?: string }>({})

const load = async () => {
  await task.load(query.value)
}
onMounted(load)

const filtered = computed(() => {
  return task.list.filter(
    (t: any) =>
      (!query.value.status || t.status === query.value.status) &&
      (!query.value.priority || t.priority === query.value.priority),
  )
})

const tagType = (s: string) =>
  ({ 待调度: '', 飞行中: 'warning', 已完成: 'success', 异常: 'danger' })[s]
const detail = (id: number) => router.push({ name: 'TaskDetail', params: { id } })
const intervene = async (id: number) => {
  await ElMessageBox.confirm(`将对任务 ${id} 进行人工干预`, '提示')
  ElMessage.success('已提交干预')
}
</script>
