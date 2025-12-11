import { defineStore } from 'pinia'
import { fetchDroneList } from '@/api/resources'

export const useDroneStore = defineStore('drone', {
  state: () => ({ list: [] as any[], loading: false }),
  actions: {
    async load() {
      this.loading = true
      const res = await fetchDroneList()
      this.list = res
      this.loading = false
    },
  },
})
