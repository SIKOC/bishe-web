<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useDroneStore } from '../stores/drone'
import type { Drone } from '../types'

const store = useDroneStore()
const expanded = ref(true)

// 初始化一些 mock 数据
onMounted(() => {
  const initial: Drone[] = Array.from({ length: 8 }).map((_, i) => ({
    id: `d-${100 + i}`,
    model: ['X1', 'X2', 'Y7'][i % 3],
    battery: Math.floor(Math.random() * 80) + 10,
    status: i % 3 === 0 ? 'flying' : 'idle',
    lastLocation: `${116 + Math.random()},${39 + Math.random()}`,
  }))
  store.setList(initial)

  // 模拟 WebSocket 每3秒更新一批数据
  const timer = setInterval(() => {
    // 随机更新某台无人机电量与位置
    const idx = Math.floor(Math.random() * store.list.length)
    const d = store.list[idx]
    if (!d) return
    const newBattery = Math.max(0, d.battery - Math.floor(Math.random() * 6))
    const newLoc = `${(116 + Math.random()).toFixed(4)}, ${(39 + Math.random()).toFixed(4)}`
    store.updateDrone(d.id, { battery: newBattery, lastLocation: newLoc })
  }, 3000)

  ;(window as any)._monitorTimer = timer
})

onBeforeUnmount(() => {
  clearInterval((window as any)._monitorTimer)
})
</script>

<template>
  <el-row :gutter="12">
    <el-col :span="6">
      <el-card style="height: 80vh; overflow: auto">
        <div
          style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          "
        >
          <div>无人机列表</div>
          <el-button size="mini" @click="expanded = !expanded">切换</el-button>
        </div>
        <el-collapse v-model="expanded">
          <el-collapse-item title="全部无人机" name="1">
            <el-list>
              <el-list-item v-for="d in store.list" :key="d.id">
                <div style="display: flex; justify-content: space-between">
                  <div>
                    <div>{{ d.id }} - {{ d.model }}</div>
                    <div style="font-size: 12px; color: #909399">
                      电量：{{ d.battery }}% · {{ d.status }}
                    </div>
                  </div>
                </div>
              </el-list-item>
            </el-list>
          </el-collapse-item>
        </el-collapse>
      </el-card>
    </el-col>
    <el-col :span="18">
      <el-card style="height: 80vh; padding: 0">
        <!-- 地图占位：后续接入 Cesium 或高德地图 -->
        <div
          id="map-container"
          style="
            height: 100%;
            background: #eef2f5;
            display: flex;
            align-items: center;
            justify-content: center;
          "
        >
          <div style="text-align: center; color: #666">
            地图容器（id="map-container"），此处为占位。后续可以接入 Cesium 或 高德地图 SDK。
          </div>
        </div>
      </el-card>
    </el-col>
  </el-row>
</template>
