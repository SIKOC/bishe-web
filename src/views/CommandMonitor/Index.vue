<template>
  <div class="screen">
    <div class="top">
      <div>在线：{{ online }} | 告警：{{ alerts }}</div>
    </div>
    <div class="left">
      <el-card>
        <template #header>在线无人机</template>
        <el-scrollbar height="360px">
          <div v-for="d in drones" :key="d.id" class="item">
            {{ d.name }} | 电量 {{ d.battery }}%
          </div>
        </el-scrollbar>
      </el-card>
    </div>
    <div class="right">
      <el-card>
        <template #header>告警流</template>
        <el-scrollbar height="360px">
          <div v-for="(a, i) in feed" :key="i" class="item">{{ a }}</div>
        </el-scrollbar>
      </el-card>
    </div>
    <div class="center">
      <MapContainer :markers="markers" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import MapContainer from '@/components/MapContainer.vue'
import { useLivePositions } from '@/hooks/useLivePositions'

const online = ref(0)
const alerts = ref(0)
const drones = ref<any[]>([])
const feed = ref<string[]>([])
let timer: any
const { markers, start, stop } = useLivePositions()

onMounted(() => {
  start()
  timer = setInterval(() => {
    online.value = Math.floor(Math.random() * 10) + 5
    alerts.value = Math.floor(Math.random() * 4)
    drones.value = Array.from({ length: online.value }, (_, i) => ({
      id: i,
      name: `DR-${100 + i}`,
      battery: Math.floor(Math.random() * 60) + 40,
    }))
    if (Math.random() > 0.6)
      feed.value.unshift(`无人机 #${Math.floor(Math.random() * 10)} 电量低于 20%`)
  }, 1500)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  stop()
})
</script>

<style scoped>
.screen {
  position: relative;
  height: calc(100vh - 120px);
  background: #052136;
}
.top {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 8px;
}
.left {
  position: absolute;
  left: 10px;
  top: 60px;
  width: 300px;
}
.right {
  position: absolute;
  right: 10px;
  top: 60px;
  width: 300px;
}
.center {
  position: absolute;
  left: 320px;
  right: 320px;
  top: 60px;
  bottom: 10px;
}
.item {
  padding: 8px;
  border-bottom: 1px dashed var(--el-border-color);
}
</style>
