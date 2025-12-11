<template>
  <el-card>
    <template #header>用户管理</template>
    <el-button type="primary" style="margin-bottom: 8px">新增用户</el-button>
    <el-table :data="users">
      <el-table-column prop="id" label="#" width="60" />
      <el-table-column prop="name" label="用户名" />
      <el-table-column prop="role" label="角色" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small">编辑</el-button>
          <el-button size="small" type="danger">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const users = ref([
  { id: 1, name: 'admin', role: '管理员' },
  { id: 2, name: 'operator', role: '操作员' },
])
</script>
