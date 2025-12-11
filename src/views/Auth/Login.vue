<template>
  <div class="login">
    <el-card class="panel">
      <template #header>登录</template>
      <el-form :model="form">
        <el-form-item label="用户名"><el-input v-model="form.username" /></el-form-item>
        <el-form-item label="密码"
          ><el-input v-model="form.password" type="password"
        /></el-form-item>
        <el-form-item><el-button type="primary" @click="login">登录</el-button></el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useUserStore } from '@/store/user'
import { useRouter } from 'vue-router'

const form = ref({ username: 'admin', password: '123456' })
const user = useUserStore()
const router = useRouter()
const login = () => {
  user.login(form.value.username)
  router.push({ name: 'Dashboard' })
}
</script>

<style scoped>
.login {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.panel {
  width: 360px;
}
</style>
