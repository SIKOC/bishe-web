<template>
  <div class="side-menu">
    <div class="brand">
      <div class="brand-logo">
        <el-icon><Compass /></el-icon>
      </div>
      <div class="brand-text">
        <div class="brand-title">调度中枢</div>
        <div class="brand-sub">Medical Drone</div>
      </div>
    </div>
    <el-menu
      class="menu"
      :default-active="active"
      router
      unique-opened
      background-color="transparent"
      text-color="#b9c9e6"
      active-text-color="#56d3ff"
    >
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

    <el-menu-item index="/message">
      <el-icon><ChatLineRound /></el-icon>
      <span>消息中心</span>
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
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { DataAnalysis, Operation, Box, Monitor, PieChart, Setting, Compass, ChatLineRound } from '@element-plus/icons-vue'

const route = useRoute()
const active = computed(() => route.path)
const user = useUserStore()
const isAdmin = user.roles.includes('admin')
</script>

<style scoped>
.side-menu {
  height: 100%;
  padding: 12px 10px;
  box-sizing: border-box;
  background: radial-gradient(120% 120% at 0% 0%, #12254a 0%, #0a1730 45%, #081122 100%);
  color: #b9c9e6;
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(102, 175, 255, 0.25);
  box-shadow: inset 0 0 12px rgba(50, 130, 255, 0.15);
}
.brand-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #3e8ef7, #58e0ff);
  color: #0b1b33;
  font-weight: 700;
}
.brand-title {
  font-size: 15px;
  font-weight: 600;
  color: #e9f2ff;
}
.brand-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #8fb6ff;
  letter-spacing: 0.6px;
}
.menu {
  border-right: none;
}
:deep(.el-menu) {
  border-right: none;
  background: transparent;
}
:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  border-radius: 10px;
  margin: 4px 0;
}
:deep(.el-menu-item:hover),
:deep(.el-sub-menu__title:hover) {
  background: rgba(86, 211, 255, 0.12);
  color: #eaf6ff;
}
:deep(.el-menu-item.is-active) {
  background: linear-gradient(90deg, rgba(86, 211, 255, 0.35), rgba(86, 211, 255, 0.1));
  color: #56d3ff;
  box-shadow: inset 0 0 0 1px rgba(86, 211, 255, 0.35);
}
:deep(.el-menu-item .el-icon),
:deep(.el-sub-menu__title .el-icon) {
  color: inherit;
}
</style>
