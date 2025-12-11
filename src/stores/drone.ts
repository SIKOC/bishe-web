import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Drone } from '../types'

export const useDroneStore = defineStore('drone', () => {
  const list = ref<Drone[]>([])

  function setList(arr: Drone[]) {
    list.value = arr
  }

  function updateDrone(id: string, partial: Partial<Drone>) {
    const idx = list.value.findIndex((d) => d.id === id)
    if (idx >= 0) list.value[idx] = { ...list.value[idx], ...partial }
  }

  return { list, setList, updateDrone }
})
