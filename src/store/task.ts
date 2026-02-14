import { defineStore } from 'pinia'
import { fetchTaskList } from '@/api/task'

export const useTaskStore = defineStore('task', {
  state: () => ({ list: [] as any[], loading: false, recommendation: null as any }),
  actions: {
    async load(params?: any) {
      this.loading = true
      try {
        const res = await fetchTaskList(params)
        this.list = res.list || []
      } finally {
        this.loading = false
      }
    },
  },
})
