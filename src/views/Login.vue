<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const username = ref('admin')
const password = ref('123456')
const loading = ref(false)
const router = useRouter()
const auth = useAuthStore()

async function doLogin() {
  loading.value = true
  try {
    await auth.login(username.value, password.value, '', '')
    router.push('/')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    style="
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #f5f7fa;
    "
  >
    <el-card style="width: 420px; padding: 24px">
      <div style="text-align: center; margin-bottom: 16px">
        <h3>医疗无人机管理后台</h3>
      </div>
      <el-form>
        <el-form-item>
          <el-input v-model="username" placeholder="用户名" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="password" placeholder="密码" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="loading" style="width: 100%" @click="doLogin"
            >登录</el-button
          >
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>
