<template>
  <div ref="container" class="map">
    <div
      v-for="m in projected"
      :key="m.id"
      class="marker"
      :style="{ left: m.x + 'px', top: m.y + 'px' }"
      @click="onClick(m)"
    >
      <span class="dot" :class="m.statusClass"></span>
      <span class="label">{{ m.label || m.id }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineProps, ref, computed, onMounted, watch } from 'vue'

type Marker = { id: string | number; lat: number; lng: number; label?: string; status?: string }
const props = defineProps<{ markers?: Marker[] }>()

const container = ref<HTMLDivElement | null>(null)
const size = ref({ w: 0, h: 0 })

function measure() {
  if (!container.value) return
  size.value = { w: container.value.clientWidth, h: container.value.clientHeight }
}

onMounted(() => {
  measure()
  const ro = new ResizeObserver(() => measure())
  if (container.value) ro.observe(container.value)
})

const projected = computed(() => {
  const list = props.markers || []
  if (!list.length || !size.value.w || !size.value.h) return [] as any[]
  const lats = list.map((m) => m.lat)
  const lngs = list.map((m) => m.lng)
  const minLat = Math.min(...lats),
    maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs)
  const pad = 20
  const w = size.value.w - pad * 2
  const h = size.value.h - pad * 2
  const latRange = Math.max(maxLat - minLat, 0.0001)
  const lngRange = Math.max(maxLng - minLng, 0.0001)
  return list.map((m) => {
    const x = pad + ((m.lng - minLng) / lngRange) * w
    const y = pad + (1 - (m.lat - minLat) / latRange) * h
    const statusClass =
      m.status === 'warning' ? 'warning' : m.status === 'error' ? 'error' : 'normal'
    return { ...m, x, y, statusClass }
  })
})

function onClick(m: any) {
  const event = new CustomEvent('map-marker-click', { detail: m })
  container.value?.dispatchEvent(event)
}

watch(
  () => props.markers,
  () => measure(),
  { deep: true },
)
</script>

<style scoped>
.map {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0b1c2c;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
}
.marker {
  position: absolute;
  transform: translate(-50%, -100%);
  display: flex;
  align-items: center;
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  background: #4caf50;
}
.dot.warning {
  background: #ff9800;
}
.dot.error {
  background: #f44336;
}
.label {
  color: #fff;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.35);
  padding: 2px 6px;
  border-radius: 4px;
}
</style>
