export function fetchDashboardStats(): Promise<{
  waybills: number
  online: number
  alerts: number
  mileage: number
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ waybills: 23, online: 7, alerts: 2, mileage: 8429 })
    }, 800)
  })
}

export function fetchConcurrent24h(): Promise<{ x: string[]; y: number[] }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const x = Array.from({ length: 24 }, (_, i) => `${i}:00`)
      const y = x.map(() => Math.floor(Math.random() * 20))
      resolve({ x, y })
    }, 800)
  })
}
