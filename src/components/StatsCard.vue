<template>
  <el-card shadow="hover">
    <div class="card">
      <div class="left">
        <div class="title">{{ title }}</div>
        <div class="value">{{ value }}</div>
      </div>
      <div class="right">
        <el-icon :size="28"><component :is="icon" /></el-icon>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'

defineProps<{ title: string; value: string | number; icon: any }>()
</script>

<style scoped>
.card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.value {
  font-size: 20px;
  font-weight: 600;
  margin-top: 6px;
}
</style>
