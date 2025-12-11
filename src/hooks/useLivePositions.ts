import { ref, onBeforeUnmount } from 'vue'
import type { DroneMarker } from '@/types/drone'

export function useLivePositions(opts?: { url?: string }) {
  const markers = ref<DroneMarker[]>([])
  let timer: any = null
  let ws: WebSocket | null = null

  function start(initial?: DroneMarker[]) {
    if (initial && initial.length) markers.value = initial
    if (opts?.url) {
      ws = new WebSocket(opts.url)
      ws.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data)
          if (Array.isArray(payload)) markers.value = payload
          else if (payload && payload.id) {
            const i = markers.value.findIndex(m => m.id === payload.id)
            if (i >= 0) markers.value[i] = { ...markers.value[i], ...payload }
            else markers.value.push(payload)
          }
        } catch {}
      }
    } else {
      timer = setInterval(() => {
        const base = { lat: 31.23, lng: 121.47 }
        const next = Array.from({ length: Math.max(markers.value.length, 6) }, (_, i) => {
          const dx = (Math.random() - 0.5) * 0.02
          const dy = (Math.random() - 0.5) * 0.02
          const prev = markers.value[i] || { id: `DR-${100 + i}`, lat: base.lat, lng: base.lng }
          const lat = prev.lat + dy
          const lng = prev.lng + dx
          const status = Math.random() > 0.9 ? 'warning' : 'normal'
          return { id: `DR-${100 + i}`, lat, lng, label: `DR-${100 + i}`, status } as DroneMarker
        })
        markers.value = next
      }, 1500)
    }
  }

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
    if (ws) ws.close()
    ws = null
  }

  onBeforeUnmount(stop)
  return { markers, start, stop }
}

