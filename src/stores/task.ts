import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Task } from '../api/task'

export const useTaskStore = defineStore('task', () => {
  const list = ref<Task[]>([])
  const total = ref(0)
  const loading = ref(false)

  function setTasks(arr: Task[], t = 0) {
    list.value = arr
    total.value = t
  }

  function setLoading(v: boolean) {
    loading.value = v
  }

  return { list, total, loading, setTasks, setLoading }
})
