<script setup lang="ts">
import { ref } from 'vue'
import type { Drone } from '../types'
import { ElMessageBox } from 'element-plus'

const props = defineProps<{ data: Drone[]; total: number }>()
const emit = defineEmits(['edit', 'delete'])

function handleEdit(row: Drone) {
  emit('edit', row)
}

function handleDelete(row: Drone) {
  ElMessageBox.confirm('确认删除该无人机吗？', '删除', { type: 'warning' })
    .then(() => emit('delete', row))
    .catch(() => {})
}
</script>

<template>
  <el-table :data="props.data" stripe style="width: 100%">
    <el-table-column prop="id" label="编号" width="120" />
    <el-table-column prop="model" label="型号" width="120" />
    <el-table-column label="电量" width="120">
      <template #default="{ row }">
        <el-tag :type="row.battery > 50 ? 'success' : row.battery > 20 ? 'warning' : 'danger'"
          >{{ row.battery }}%</el-tag
        >
      </template>
    </el-table-column>
    <el-table-column prop="status" label="状态" width="140">
      <template #default="{ row }">
        <el-tag
          :type="row.status === 'idle' ? 'success' : row.status === 'flying' ? 'info' : 'danger'"
          >{{ row.status }}</el-tag
        >
      </template>
    </el-table-column>
    <el-table-column prop="lastLocation" label="最后位置" />
    <el-table-column label="操作" width="180">
      <template #default="{ row }">
        <el-button size="mini" @click="handleEdit(row)">编辑</el-button>
        <el-button size="mini" type="danger" @click="handleDelete(row)">删除</el-button>
      </template>
    </el-table-column>
  </el-table>
</template>
