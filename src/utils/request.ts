import axios from 'axios'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/',
  timeout: 10000,
})

// 请求拦截器：可在此加入 token
service.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('token')
    if (token && config.headers) config.headers.Authorization = `Bearer ${token}`
  } catch (e) {
    // ignore
  }
  return config
})

// 响应拦截器：可统一处理错误
service.interceptors.response.use(
  (res) => res.data,
  (error) => {
    return Promise.reject(error)
  },
)

export default service
