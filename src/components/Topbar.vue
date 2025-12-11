<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '../stores/auth'
const auth = useAuthStore()
const userName = computed(() => auth.user?.name || '访客')
const emit = defineEmits(['logout'])
</script>

<template>
  <div style="display: flex; align-items: center; justify-content: flex-end; height: 48px">
    <el-dropdown trigger="click">
      <span class="el-dropdown-link">
        <el-avatar size="32" /> <span style="margin: 0 8px">{{ userName }}</span>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item @click.prevent="emit('logout')">退出登录</el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>
