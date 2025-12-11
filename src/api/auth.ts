// 模拟认证 API
export function loginApi(username: string, password: string) {
  // 这里模拟网络请求，返回一个 token 和用户信息
  return Promise.resolve({
    token: 'mock-token-123456',
    user: { name: username || '管理员', avatar: '' },
  })
}

export function logoutApi() {
  return Promise.resolve({})
}
