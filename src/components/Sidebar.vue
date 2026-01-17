<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const menus = [
  { name: '仪表盘', path: '/', icon: 'HomeFilled' },
  { name: '无人机管理', path: '/resources/drones', icon: 'Ticket' },
  { name: '实时监控', path: '/monitor', icon: 'Map' },
  { name: '运营分析', path: '/analytics/operation', icon: 'DataAnalysis' },
]

const route = useRoute()
const router = useRouter()

function to(p: string) {
  router.push(p)
}
</script>

<template>
  <div style="padding: 16px">
    <div style="color: #fff; font-size: 18px; margin-bottom: 12px">医疗无人机调度</div>
    <el-menu
      :default-active="route.path"
      class="el-menu-vertical-demo"
      background-color="#001529"
      text-color="#bfcbd9"
      active-text-color="#fff"
    >
      <el-menu-item v-for="m in menus" :key="m.path" :index="m.path" @click="to(m.path)">
        <span>{{ m.name }}</span>
      </el-menu-item>
    </el-menu>
  </div>
</template>

<style scoped>
.el-menu-vertical-demo {
  border-right: 0;
}
</style>
