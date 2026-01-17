import request from '@/utils/request'

export function loginApi(payload: any) {
  return request.post('/user/auth/login', payload)
}

export function sendSmsCode(phone: string) {
  return request.post('/user/auth/sms-code', { phone })
}

export function registerApi(payload: any) {
  return request.post('/user/auth/register', payload)
}

export function getCaptcha() {
  return request.get('/user/auth/captch')
}

export function verify2FA(payload: { code: string; challengeId: string }) {
  return request.post('/auth/2fa/verify', payload)
}

export function refreshApi() {
  return request.post('/auth/refresh', {})
}

export function logoutApi() {
  return request.post('/auth/logout', {})
}
