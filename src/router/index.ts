import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    meta: { title: '登录', public: true },
    component: () => import('@/views/Auth/Login.vue'),
  },
  {
    path: '/',
    name: 'Root',
    component: () => import('@/layout/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Dashboard',
        meta: { title: '仪表盘', breadcrumb: ['仪表盘'], icon: 'DataAnalysis', requiresAuth: true },
        component: () => import('@/views/Dashboard/Index.vue'),
      },
      {
        path: 'task',
        name: 'TaskCenter',
        meta: {
          title: '任务调度中心',
          breadcrumb: ['任务调度中心'],
          icon: 'Operation',
          requiresAuth: true,
        },
        redirect: { name: 'TaskList' },
        children: [
          {
            path: 'create',
            name: 'TaskCreate',
            meta: { title: '发起任务', breadcrumb: ['任务调度中心', '发起任务'] },
            component: () => import('@/views/TaskCenter/TaskCreate.vue'),
          },
          {
            path: 'list',
            name: 'TaskList',
            meta: { title: '任务列表', breadcrumb: ['任务调度中心', '任务列表'] },
            component: () => import('@/views/TaskCenter/TaskList.vue'),
          },
          {
            path: 'detail/:id',
            name: 'TaskDetail',
            meta: { title: '任务详情', breadcrumb: ['任务调度中心', '任务详情'] },
            component: () => import('@/views/TaskCenter/TaskDetail.vue'),
          },
        ],
      },
      {
        path: 'resources',
        name: 'Resources',
        meta: { title: '资源管理', breadcrumb: ['资源管理'], icon: 'Box', requiresAuth: true },
        redirect: { name: 'DroneList' },
        children: [
          {
            path: 'drones',
            name: 'DroneList',
            meta: { title: '无人机台账', breadcrumb: ['资源管理', '无人机台账'] },
            component: () => import('@/views/Resources/DroneList.vue'),
          },
          {
            path: 'maintenance',
            name: 'Maintenance',
            meta: { title: '维护记录', breadcrumb: ['资源管理', '维护记录'] },
            component: () => import('@/views/Resources/Maintenance.vue'),
          },
          {
            path: 'locations',
            name: 'Locations',
            meta: { title: '医院/停机坪管理', breadcrumb: ['资源管理', '医院/停机坪管理'] },
            component: () => import('@/views/Resources/Locations.vue'),
          },
        ],
      },
      {
        path: 'monitor',
        name: 'CommandMonitor',
        meta: {
          title: '实时监控指挥',
          breadcrumb: ['实时监控指挥'],
          icon: 'Monitor',
          requiresAuth: true,
        },
        component: () => import('@/views/CommandMonitor/Index.vue'),
      },
      {
        path: 'analytics',
        name: 'Analytics',
        meta: { title: '数据报表', breadcrumb: ['数据报表'], icon: 'PieChart', requiresAuth: true },
        redirect: { name: 'OperationAnalytics' },
        children: [
          {
            path: 'operation',
            name: 'OperationAnalytics',
            meta: { title: '运营分析', breadcrumb: ['数据报表', '运营分析'] },
            component: () => import('@/views/Analytics/Operation.vue'),
          },
          {
            path: 'efficiency',
            name: 'EfficiencyAnalytics',
            meta: { title: '能效分析', breadcrumb: ['数据报表', '能效分析'] },
            component: () => import('@/views/Analytics/Efficiency.vue'),
          },
        ],
      },
      {
        path: 'system',
        name: 'System',
        meta: {
          title: '系统设置',
          breadcrumb: ['系统设置'],
          icon: 'Setting',
          requiresAuth: true,
          roles: ['admin'],
        },
        children: [
          {
            path: 'users',
            name: 'UserMgmt',
            meta: { title: '用户管理', breadcrumb: ['系统设置', '用户管理'], roles: ['admin'] },
            component: () => import('@/views/System/User.vue'),
          },
          {
            path: 'roles',
            name: 'RoleMgmt',
            meta: { title: '角色权限', breadcrumb: ['系统设置', '角色权限'], roles: ['admin'] },
            component: () => import('@/views/System/Role.vue'),
          },
        ],
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to, _from, next) => {
  const auth = useAuthStore()
  if (to.meta.public) return next()
  if (to.meta.requiresAuth && !auth.accessToken) return next({ name: 'Login' })
  next()
})

export default router
