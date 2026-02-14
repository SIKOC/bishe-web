import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
})

service.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
  } catch {}
  return config
})

let refreshing = false
let queue: any[] = []

service.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const status = error?.response?.status
    const code = error?.response?.data?.code
    if (status === 401 && code === 'token_expired') {
      if (refreshing) {
        return new Promise((resolve, reject) => queue.push({ resolve, reject, config: error.config }))
      }
      refreshing = true
      try {
        const store = useAuthStore()
        await store.refresh()
        queue.forEach(({ resolve, config }) => resolve(service(config)))
        queue = []
        refreshing = false
        return service(error.config)
      } catch (e) {
        queue.forEach(({ reject }) => reject(e))
        queue = []
        refreshing = false
        return Promise.reject(e)
      }
    }
    return Promise.reject(error)
  },
)

export default service
