<template>
  <div class="bar">
    <div class="left">
      <el-icon><Compass /></el-icon>
      <span style="margin-left: 8px">医疗无人机资源调度系统</span>
    </div>
    <div class="right">
      <el-dropdown>
        <span class="el-dropdown-link">
          <el-avatar size="small">U</el-avatar>
          <span style="margin-left: 8px">{{ user.username || '未登录' }}</span>
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
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'

const user = useUserStore()
const router = useRouter()
const logout = () => {
  user.logout()
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.left {
  display: flex;
  align-items: center;
}
.right {
  display: flex;
  align-items: center;
}
</style>
