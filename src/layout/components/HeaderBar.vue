<template>
  <div class="bar">
    <div class="left">
      <div class="logo">
        <el-icon><Compass /></el-icon>
      </div>
      <div class="brand">
        <div class="brand-title">医疗无人机资源调度系统</div>
        <div class="brand-sub">Smart Dispatch Console</div>
      </div>
    </div>
    <div class="right">
      <el-dropdown>
        <span class="el-dropdown-link user-pill">
          <el-avatar size="small">U</el-avatar>
          <span class="user-name">{{ auth.user?.username || '未登录' }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowDown, Compass } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const logout = () => {
  auth.logout()
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 16px;
  color: #e6f0ff;
}
.left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #4f8efb, #7db9ff);
  color: #fff;
  box-shadow: 0 6px 14px rgba(79, 142, 251, 0.35);
}
.brand-title {
  font-size: 16px;
  font-weight: 600;
  color: #e6f0ff;
}
.brand-sub {
  font-size: 12px;
  color: #9bb3d3;
}
.right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
.user-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(86, 211, 255, 0.3);
  color: #e6f0ff;
}
.user-name {
  font-size: 13px;
  color: #e6f0ff;
}
</style>
