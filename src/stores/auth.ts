import { defineStore } from 'pinia'
import { ref } from 'vue'
import { loginApi, logoutApi, refreshApi, verify2FA } from '../api/auth'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem('access_token'))
  const user = ref<any>(JSON.parse(localStorage.getItem('user') || 'null'))
  const roles = ref<string[]>(JSON.parse(localStorage.getItem('roles') || '[]'))
  const mfaRequired = ref(false)
  const mfaChallengeId = ref<string | null>(null)

  async function login(username: string, password: string, captcha: string, captchaId: string) {
    const res: any = await loginApi({ username, password, captcha, captchaId })
    if (res?.mfa_required) {
      mfaRequired.value = true
      mfaChallengeId.value = res?.challenge_id || null
      return res
    }
    if (typeof res?.code !== 'undefined' && res.code !== 0) {
      throw new Error(res?.message || '登录失败')
    }
    const data = res?.data ?? res
    accessToken.value = data?.token || null
    user.value = data ? { id: data?.useId ?? data?.userId ?? null, username: data?.username || '' } : null
    roles.value = []
    if (accessToken.value) localStorage.setItem('access_token', accessToken.value)
    if (user.value) localStorage.setItem('user', JSON.stringify(user.value))
    localStorage.setItem('roles', JSON.stringify(roles.value))
    return data
  }

  async function refresh() {
    const res: any = await refreshApi()
    accessToken.value = res?.access_token || null
    if (accessToken.value) localStorage.setItem('access_token', accessToken.value)
    return res
  }

  async function logout() {
    try { await logoutApi() } catch {}
    accessToken.value = null
    user.value = null
    roles.value = []
    mfaRequired.value = false
    mfaChallengeId.value = null
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
    localStorage.removeItem('roles')
  }

  async function verifyMfa(code: string) {
    const res: any = await verify2FA({ code, challengeId: mfaChallengeId.value || '' })
    accessToken.value = res?.access_token || null
    user.value = res?.user || null
    roles.value = res?.roles || []
    localStorage.setItem('access_token', accessToken.value || '')
    if (user.value) localStorage.setItem('user', JSON.stringify(user.value))
    localStorage.setItem('roles', JSON.stringify(roles.value))
    mfaRequired.value = false
    mfaChallengeId.value = null
    return res
  }

  return { accessToken, user, roles, mfaRequired, mfaChallengeId, login, refresh, logout, verifyMfa }
})
