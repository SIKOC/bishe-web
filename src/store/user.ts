import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    token: 'dev-token',
    username: 'admin',
    roles: ['admin'],
  }),
  actions: {
    login(name: string) {
      this.username = name
      this.token = 'dev-token'
      this.roles = name === 'admin' ? ['admin'] : ['user']
    },
    logout() {
      this.username = ''
      this.token = ''
      this.roles = []
    },
  },
})
