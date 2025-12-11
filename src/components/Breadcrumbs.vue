<template>
  <el-breadcrumb separator="/" style="margin-bottom: 12px">
    <el-breadcrumb-item v-for="(b, i) in crumbs" :key="i">{{ b }}</el-breadcrumb-item>
  </el-breadcrumb>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const crumbs = computed(() => {
  const matched = route.matched
  const list: string[] = []
  matched.forEach((m) => {
    const bc = (m.meta as any)?.breadcrumb as string[] | undefined
    if (bc && bc.length) list.push(...bc)
  })
  return Array.from(new Set(list))
})
</script>
