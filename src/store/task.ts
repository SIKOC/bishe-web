import { defineStore } from 'pinia'
import { fetchTaskList } from '@/api/task'

export const useTaskStore = defineStore('task', {
  state: () => ({ list: [] as any[], loading: false, recommendation: null as any }),
  actions: {
    async load(params?: any) {
      this.loading = true
      const res = await fetchTaskList(params)
      this.list = res
      this.loading = false
    },
  },
})
