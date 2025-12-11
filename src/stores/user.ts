import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref<string | null>(localStorage.getItem('token'))
  const info = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))

  function setToken(t: string) {
    token.value = t
    localStorage.setItem('token', t)
  }

  function setInfo(u: any) {
    info.value = u
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    token.value = null
    info.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, info, setToken, setInfo, logout }
})
