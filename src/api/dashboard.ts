import request from '@/utils/request'

export async function fetchDashboardStats(): Promise<{
  waybills: number
  online: number
  alerts: number
  mileage: number
}> {
  // Parallel fetch for stats
  const [tasks, drones] = await Promise.all([
    request.get('/task/tasks', { params: { page: 1, size: 1, status: 'in_progress' } }),
    request.get('/drone/drones', { params: { page: 1, size: 1, status: 'flying' } })
  ])
  
  return {
    waybills: tasks?.data?.total || tasks?.total || 0,
    online: drones?.data?.total || drones?.total || 0,
    alerts: 0, // Not implemented in backend yet
    mileage: 12580 // Mock for now
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
