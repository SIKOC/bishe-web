<template>
  <div class="scene">
    <canvas ref="canvasRef" id="canvas-bg"></canvas>

    <!-- 雷达装饰层 -->
    <div class="radar-layer">
      <div class="radar-circle" style="width: 60%; height: 60%"></div>
      <div class="radar-circle" style="width: 30%; height: 30%"></div>
    </div>

    <div class="login-container">
      <!-- 装饰角 -->
      <div class="corner-decoration top-left"></div>
      <div class="corner-decoration top-right"></div>
      <div class="corner-decoration bottom-left"></div>
      <div class="corner-decoration bottom-right"></div>

      <div class="header-section">
        <div class="drone-icon">
          <i class="fa-solid fa-jet-fighter-up"></i>
        </div>
        <h2>医疗无人机</h2>
        <div class="sub-title">资源调度系统</div>
      </div>

      <!-- 切换标签 -->
      <div class="form-toggle">
        <button class="toggle-btn" :class="{ active: mode === 'login' }" @click="switchTo('login')">
          登录
        </button>
        <button
          class="toggle-btn"
          :class="{ active: mode === 'register' }"
          @click="switchTo('register')"
        >
          注册
        </button>
      </div>

      <transition name="fade" mode="out-in">
        <form v-if="mode === 'login'" @submit.prevent="onLogin" key="login">
          <!-- 账号输入 -->
          <div class="input-group">
            <input type="text" v-model="form.username" required />
            <label>手机号 / 账号</label>
            <div class="scan-line"></div>
          </div>

          <!-- 密码输入 -->
          <div class="input-group">
            <input type="password" v-model="form.password" required />
            <label>密码</label>
            <div class="scan-line"></div>
          </div>

          <!-- 验证码输入 -->
          <div class="input-group">
            <div class="input-row">
              <div style="flex: 1; position: relative">
                <input type="text" v-model="captchaCode" required />
                <label>验证码</label>
                <div class="scan-line"></div>
              </div>
              <img
                :src="captchaImg"
                class="captcha-img"
                @click="loadCaptcha"
                v-if="captchaImg"
                style="
                  height: 40px;
                  border: 1px solid var(--primary-color);
                  cursor: pointer;
                  margin-left: 10px;
                "
              />
            </div>
          </div>

          <!-- MFA 输入 -->
          <div class="input-group" v-if="auth.mfaRequired">
            <div class="input-row">
              <div style="flex: 1; position: relative">
                <input type="text" v-model="mfaCode" required maxlength="6" />
                <label>二步验证码</label>
                <div class="scan-line"></div>
              </div>
              <button type="button" class="code-btn" @click="onVerifyMfa">验证</button>
            </div>
          </div>

          <button type="submit" class="action-btn">
            {{ loading ? '处理中...' : '进入系统' }}
          </button>
        </form>

        <form v-else @submit.prevent="onRegister" key="register">
          <div class="input-group">
            <input type="text" v-model="reg.username" required />
            <label>用户名</label>
            <div class="scan-line"></div>
          </div>

          <div class="input-group">
            <input type="text" v-model="reg.phone" required />
            <label>手机号</label>
            <div class="scan-line"></div>
          </div>

          <div class="input-group">
            <input type="password" v-model="reg.password" required />
            <label>设置密码</label>
            <div class="scan-line"></div>
          </div>

          <div class="input-group">
            <input type="password" v-model="reg.confirm" required />
            <label>确认密码</label>
            <div class="scan-line"></div>
          </div>

          <!-- 验证码输入行 -->
          <div class="input-group">
            <div class="input-row">
              <div style="flex: 1; position: relative">
                <input type="text" v-model="reg.code" required />
                <label>短信验证码</label>
                <div class="scan-line"></div>
              </div>
              <button type="button" class="code-btn" @click="sendCode" :disabled="countdown > 0">
                {{ countdown > 0 ? `${countdown}秒` : '发送验证码' }}
              </button>
            </div>
          </div>

          <button type="submit" class="action-btn">
            {{ loading ? '处理中...' : '注册账号' }}
          </button>
        </form>
      </transition>

      <div class="system-status">
        <span>系统: 在线</span>
        <span>网络: 安全</span>
        <span>版本: 3.0.1</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { getCaptcha, sendSmsCode } from '@/api/auth'

const fontLink1 = document.createElement('link')
fontLink1.rel = 'stylesheet'
fontLink1.href =
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=Rajdhani:wght@300;500;600&display=swap'
document.head.appendChild(fontLink1)
const fontLink2 = document.createElement('link')
fontLink2.rel = 'stylesheet'
fontLink2.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
document.head.appendChild(fontLink2)

const mode = ref<'login' | 'register'>('login')
const form = ref({ username: '', password: '' })
const reg = ref({ username: '', phone: '', password: '', confirm: '', code: '' })
const loading = ref(false)
const router = useRouter()
const auth = useAuthStore()
const captchaId = ref<string | null>(null)
const captchaImg = ref<string>('')
const captchaCode = ref<string>('')
const mfaCode = ref<string>('')
const canvasRef = ref<HTMLCanvasElement | null>(null)
let anim: number | null = null
const countdown = ref(0)
let timer: number | null = null

const switchTo = (m: 'login' | 'register') => {
  mode.value = m
  if (m === 'login') loadCaptcha()
}

const loadCaptcha = async () => {
  try {
    const res: any = await getCaptcha()
    if (res?.code === 0 && res?.data) {
      captchaId.value = res.data.captchaId
      // 自动补全 Base64 前缀
      const base64 = res.data.imageBase64
      captchaImg.value = base64.startsWith('data:') ? base64 : `data:image/png;base64,${base64}`
    }
  } catch (e) {
    console.error(e)
  }
}

const onLogin = async () => {
  loading.value = true
  try {
    if (!captchaId.value) {
      ElMessage.error('验证码加载失败，请刷新')
      await loadCaptcha()
      return
    }
    const res = await auth.login(
      form.value.username,
      form.value.password,
      captchaCode.value,
      captchaId.value
    )
    if (res?.mfa_required) {
      ElMessage.info('需要二步验证')
    } else {
      ElMessage.success('登录成功')
      router.replace({ name: 'Dashboard' })
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '登录失败')
    await loadCaptcha()
  } finally {
    loading.value = false
  }
}

const onVerifyMfa = async () => {
  loading.value = true
  try {
    await auth.verifyMfa(mfaCode.value)
    ElMessage.success('ACCESS GRANTED')
    router.replace({ name: 'Dashboard' })
  } catch (e: any) {
    ElMessage.error(e?.message || 'VERIFICATION FAILED')
  } finally {
    loading.value = false
  }
}

const onRegister = async () => {
  if (reg.value.password !== reg.value.confirm) {
    ElMessage.error('PASSWORD MISMATCH')
    return
  }
  loading.value = true
  try {
    const { registerApi } = await import('@/api/auth')
    // 注册接口入参：username, password, phone, captcha (后端字段叫captcha，前端变量叫code)
    await registerApi({
      username: reg.value.username,
      password: reg.value.password,
      phone: reg.value.phone,
      captcha: reg.value.code, // 👈 关键修正：后端字段名为 captcha
    })
    ElMessage.success('注册成功，请登录')
    mode.value = 'login'
    form.value.username = reg.value.username
  } catch (e: any) {
    ElMessage.error(e?.message || 'REGISTRATION FAILED')
  } finally {
    loading.value = false
  }
}

const sendCode = async () => {
  if (!reg.value.phone) {
    ElMessage.error('请输入手机号')
    return
  }
  if (countdown.value > 0) return

  try {
    const res: any = await sendSmsCode(reg.value.phone)
    // 开发环境：直接显示验证码
    if (res?.data || typeof res === 'string' || typeof res === 'number') {
      const code = res?.data || res
      ElMessage.success(`验证码已发送: ${code}`)
      reg.value.code = String(code) // 自动填充方便调试
    } else {
      ElMessage.success('验证码已发送')
    }

    countdown.value = 60
    if (timer) clearInterval(timer)
    timer = window.setInterval(() => {
      countdown.value--
      if (countdown.value <= 0 && timer) {
        clearInterval(timer)
        timer = null
      }
    }, 1000)
  } catch (e: any) {
    ElMessage.error(e.message || '发送失败')
  }
}

const runParticles = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const w = (canvas.width = window.innerWidth)
  const h = (canvas.height = window.innerHeight)
  const particles: any[] = []

  for (let i = 0; i < 100; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2,
    })
  }

  const loop = () => {
    ctx.clearRect(0, 0, w, h)

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i]
      p.x += p.vx
      p.y += p.vy
      if (p.x < 0 || p.x > w) p.vx *= -1
      if (p.y < 0 || p.y > h) p.vy *= -1

      ctx.fillStyle = 'rgba(0, 243, 255, 0.5)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      for (let j = i; j < particles.length; j++) {
        const dx = p.x - particles[j].x
        const dy = p.y - particles[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 150) {
          ctx.beginPath()
          ctx.strokeStyle = `rgba(0, 243, 255, ${1 - dist / 150})`
          ctx.lineWidth = 0.5
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(particles[j].x, particles[j].y)
          ctx.stroke()
        }
      }
    }
    anim = requestAnimationFrame(loop)
  }
  loop()
}

onMounted(() => {
  loadCaptcha()
  runParticles()
  window.addEventListener('resize', () => {
    if (canvasRef.value) {
      canvasRef.value.width = window.innerWidth
      canvasRef.value.height = window.innerHeight
    }
  })
})
onBeforeUnmount(() => {
  if (anim) cancelAnimationFrame(anim)
})
</script>

<style scoped>
:root {
  --primary-color: #00f3ff;
  --secondary-color: #bc13fe;
  --alert-color: #ff9d00;
  --bg-color: #050510;
  --glass-bg: rgba(10, 25, 45, 0.7);
  --border-color: rgba(0, 243, 255, 0.3);
}

.scene {
  background-color: #050510;
  color: #00f3ff;
  font-family: 'Rajdhani', sans-serif;
  overflow: hidden;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

#canvas-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.radar-layer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vh;
  height: 80vh;
  border: 1px dashed rgba(0, 243, 255, 0.1);
  border-radius: 50%;
  pointer-events: none;
  z-index: 1;
}

.radar-layer::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    transparent 80%,
    rgba(0, 243, 255, 0.1) 100%
  );
  animation: radar-spin 4s linear infinite;
}

.radar-circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(0, 243, 255, 0.1);
  border-radius: 50%;
}

@keyframes radar-spin {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

.login-container {
  position: relative;
  z-index: 10;
  width: 420px;
  padding: 40px;
  background: rgba(10, 25, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(0, 243, 255, 0.3);
  box-shadow: 0 0 30px rgba(0, 243, 255, 0.15);
  clip-path: polygon(
    20px 0,
    100% 0,
    100% calc(100% - 20px),
    calc(100% - 20px) 100%,
    0 100%,
    0 20px
  );
  transition: height 0.3s ease;
}

.header-section {
  text-align: center;
  margin-bottom: 30px;
}

.drone-icon {
  font-size: 40px;
  margin-bottom: 10px;
  color: #00f3ff;
  text-shadow: 0 0 15px #00f3ff;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 24px;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 5px;
  color: #00f3ff;
}

.sub-title {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2px;
}

.form-toggle {
  display: flex;
  margin-bottom: 25px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.toggle-btn {
  flex: 1;
  padding: 10px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-family: 'Orbitron', sans-serif;
  cursor: pointer;
  transition: 0.3s;
  position: relative;
}

.toggle-btn.active {
  color: #00f3ff;
}

.toggle-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background: #00f3ff;
  box-shadow: 0 0 10px #00f3ff;
}

.input-group {
  position: relative;
  margin-bottom: 25px;
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

input {
  width: 100%;
  padding: 10px 0;
  font-size: 16px;
  color: #fff;
  background: transparent;
  border: none;
  border-bottom: 1px solid #333;
  outline: none;
  transition: 0.3s;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 1px;
}

label {
  position: absolute;
  top: 10px;
  left: 0;
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
  transition: 0.3s;
  text-transform: uppercase;
}

input:focus ~ label,
input:valid ~ label {
  top: -18px;
  font-size: 12px;
  color: #00f3ff;
}

input:focus,
input:valid {
  border-bottom: 1px solid #00f3ff;
}

.scan-line {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background: #00f3ff;
  transition: 0.5s;
  box-shadow: 0 0 10px #00f3ff;
}

input:focus ~ .scan-line {
  width: 100%;
}

.code-btn {
  padding: 8px 15px;
  background: rgba(0, 243, 255, 0.1);
  border: 1px solid #00f3ff;
  color: #00f3ff;
  font-family: 'Rajdhani', sans-serif;
  font-weight: bold;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  min-width: 100px;
  transition: 0.3s;
}

.code-btn:hover:not(:disabled) {
  background: #00f3ff;
  color: #000;
}

.code-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  border-color: #555;
  color: #888;
}

.action-btn {
  position: relative;
  width: 100%;
  padding: 12px;
  margin-top: 10px;
  background: linear-gradient(90deg, transparent, rgba(0, 243, 255, 0.1), transparent);
  color: #00f3ff;
  border: 1px solid #00f3ff;
  font-family: 'Orbitron', sans-serif;
  font-size: 16px;
  letter-spacing: 2px;
  cursor: pointer;
  overflow: hidden;
  transition: 0.5s;
  text-transform: uppercase;
}

.action-btn:hover {
  background: #00f3ff;
  color: #000;
  box-shadow: 0 0 20px #00f3ff;
}

.corner-decoration {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid #00f3ff;
  transition: all 0.3s ease;
}

.top-left {
  top: 0;
  left: 0;
  border-right: 0;
  border-bottom: 0;
}
.bottom-right {
  bottom: 0;
  right: 0;
  border-left: 0;
  border-top: 0;
}
.top-right {
  top: 0;
  right: 0;
  border-left: 0;
  border-bottom: 0;
  border-color: #ff9d00;
}
.bottom-left {
  bottom: 0;
  left: 0;
  border-right: 0;
  border-top: 0;
  border-color: #ff9d00;
}

.system-status {
  margin-top: 25px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 10px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
