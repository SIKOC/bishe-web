<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Sidebar from '../components/Sidebar.vue'
import Topbar from '../components/Topbar.vue'
import Breadcrumbs from '../components/Breadcrumbs.vue'
const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <el-container style="height: 100vh">
    <el-aside width="220px" class="sidebar">
      <Sidebar />
    </el-aside>
    <el-container>
      <el-header class="header">
        <Topbar @logout="handleLogout" />
      </el-header>
      <el-main class="main-container">
        <Breadcrumbs />
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.sidebar {
  background: #001529;
  color: #fff;
}
.header {
  background: #fff;
  padding: 0 16px;
}
.main-container {
  padding: 16px;
}
</style>
