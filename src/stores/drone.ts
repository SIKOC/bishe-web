import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchDroneList } from '@/api/resources'

export const useDroneStore = defineStore('drone', () => {
  const list = ref<any[]>([])
  const loading = ref(false)

  async function load() {
    loading.value = true
    try {
      list.value = await fetchDroneList()
    } finally {
      loading.value = false
    }
  }

  function setList(arr: any[]) {
    list.value = arr
  }

  function updateDrone(id: string, partial: any) {
    const idx = list.value.findIndex((d) => d.id === id)
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...partial }
  }

  return { list, loading, load, setList, updateDrone }
})
