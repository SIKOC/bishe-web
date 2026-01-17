import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchTaskList } from '@/api/task'

export const useTaskStore = defineStore('task', () => {
  const list = ref<any[]>([])
  const total = ref(0)
  const loading = ref(false)

  function setTasks(arr: any[], t = 0) {
    list.value = arr
    total.value = t
  }

  function setLoading(v: boolean) {
    loading.value = v
  }

  async function load(params?: any) {
    loading.value = true
    try {
      const res = await fetchTaskList(params)
      setTasks(res, Array.isArray(res) ? res.length : 0)
    } finally {
      loading.value = false
    }
  }

  return { list, total, loading, setTasks, setLoading, load }
})
