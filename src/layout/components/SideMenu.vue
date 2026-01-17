<template>
  <el-menu :default-active="active" router unique-opened>
    <el-menu-item index="/">
      <el-icon><DataAnalysis /></el-icon>
      <span>仪表盘</span>
    </el-menu-item>

    <el-sub-menu index="/task">
      <template #title>
        <el-icon><Operation /></el-icon>
        <span>任务调度中心</span>
      </template>
      <el-menu-item index="/task/create">发起任务</el-menu-item>
      <el-menu-item index="/task/list">任务列表</el-menu-item>
    </el-sub-menu>

    <el-sub-menu index="/resources">
      <template #title>
        <el-icon><Box /></el-icon>
        <span>资源管理</span>
      </template>
      <el-menu-item index="/resources/drones">无人机台账</el-menu-item>
      <el-menu-item index="/resources/maintenance">维护记录</el-menu-item>
      <el-menu-item index="/resources/locations">医院/停机坪管理</el-menu-item>
    </el-sub-menu>

    <el-menu-item index="/monitor">
      <el-icon><Monitor /></el-icon>
      <span>实时监控指挥</span>
    </el-menu-item>

    <el-sub-menu index="/analytics">
      <template #title>
        <el-icon><PieChart /></el-icon>
        <span>数据报表</span>
      </template>
      <el-menu-item index="/analytics/operation">运营分析</el-menu-item>
      <el-menu-item index="/analytics/efficiency">能效分析</el-menu-item>
    </el-sub-menu>

    <el-sub-menu v-if="isAdmin" index="/system">
      <template #title>
        <el-icon><Setting /></el-icon>
        <span>系统设置</span>
      </template>
      <el-menu-item index="/system/users">用户管理</el-menu-item>
      <el-menu-item index="/system/roles">角色权限</el-menu-item>
    </el-sub-menu>
  </el-menu>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { DataAnalysis, Operation, Box, Monitor, PieChart, Setting } from '@element-plus/icons-vue'

const route = useRoute()
const active = computed(() => route.path)
const user = useUserStore()
const isAdmin = user.roles.includes('admin')
</script>
