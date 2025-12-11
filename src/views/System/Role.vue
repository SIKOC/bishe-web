<template>
  <el-card>
    <template #header>角色权限</template>
    <el-table :data="roles">
      <el-table-column prop="name" label="角色" />
      <el-table-column label="权限">
        <template #default="{ row }">
          <el-checkbox-group v-model="row.perms">
            <el-checkbox label="查看" />
            <el-checkbox label="编辑" />
            <el-checkbox label="管理" />
          </el-checkbox-group>
        </template>
      </el-table-column>
    </el-table>
  </el-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const roles = ref([
  { name: '管理员', perms: ['查看', '编辑', '管理'] },
  { name: '操作员', perms: ['查看'] },
])
</script>
