<template>
  <div class="layout">
    <el-container style="height: 100vh">
      <el-aside width="220px" class="aside">
        <SideMenu />
      </el-aside>
      <el-container>
        <el-header class="header">
          <HeaderBar />
        </el-header>
        <el-main class="main">
          <Breadcrumbs />
          <router-view v-slot="{ Component }">
            <transition name="fade">
              <component :is="Component" />
            </transition>
          </router-view>
        </el-main>
      </el-container>
    </el-container>
  </div>
  <el-dialog v-model="globalLoading" width="200px" align-center>
    <div style="text-align: center">
      <el-icon><Loading /></el-icon>
    </div>
    <div style="text-align: center; margin-top: 8px">加载中</div>
  </el-dialog>
</template>

<script setup lang="ts">
import SideMenu from './components/SideMenu.vue'
import HeaderBar from './components/HeaderBar.vue'
import Breadcrumbs from '@/components/Breadcrumbs.vue'
import { Loading } from '@element-plus/icons-vue'
import { ref } from 'vue'

const globalLoading = ref(false)
</script>

<style scoped>
.aside {
  border-right: none;
  background: #0a1730;
}
.header {
  display: flex;
  align-items: center;
  height: 56px;
}
.main {
  padding: 12px;
}
.fade-enter-active, .fade-leave-active { transition: opacity .25s ease }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
