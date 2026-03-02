import request from '@/utils/request'

export async function fetchDashboardStats(): Promise<{
  waybills: number
  online: number
  alerts: number
  mileage: number
}> {
  // Parallel fetch for stats
  // Use /drone/live for accurate online/flying count
  const [tasks, liveDrones] = await Promise.all([
    request.get('/task/tasks', { params: { page: 1, size: 1, status: 'in_progress' } }),
    request.get('/drone/live')
  ])
  
  const liveList = (liveDrones?.data || liveDrones || [])
  const onlineCount = Array.isArray(liveList) ? liveList.filter((d: any) => d.status !== 'idle' && d.status !== 'maintenance').length : 0

  return {
    waybills: tasks?.data?.total || tasks?.total || 0,
    online: onlineCount,
    alerts: 0, 
    mileage: 12580 
  }
}

export function fetchConcurrent24h(): Promise<{ x: string[]; y: number[] }> {
  // Mock for chart
  return new Promise((resolve) => {
    setTimeout(() => {
      const x = Array.from({ length: 24 }, (_, i) => `${i}:00`)
      const y = x.map(() => Math.floor(Math.random() * 20))
      resolve({ x, y })
    }, 800)
  })
}
