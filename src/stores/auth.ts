import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, logoutApi } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))

  async function login(username: string, password: string) {
    const res = await loginApi(username, password)
    token.value = res.token
    user.value = res.user
    localStorage.setItem('token', res.token)
    localStorage.setItem('user', JSON.stringify(res.user))
    return res
  }

  async function logout() {
    await logoutApi()
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, login, logout }
})
