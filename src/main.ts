import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as Icons from '@element-plus/icons-vue'
import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

Object.entries(Icons).forEach(([name, component]) => {
  app.component(name, component as any)
})

app.use(pinia)
app.use(router)
app.use(ElementPlus)
app.mount('#app')
