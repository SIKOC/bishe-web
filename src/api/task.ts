export function fetchTaskList(params?: any): Promise<any[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = Array.from({ length: 15 }, (_, i) => ({
        id: i + 1,
        name: `任务-${i + 1}`,
        status: ['待调度', '飞行中', '已完成', '异常'][i % 4],
        priority: ['低', '中', '高'][i % 3],
        time: `2025-12-10 ${String(8 + (i % 10)).padStart(2, '0')}:00`,
        origin: '市立医院',
        target: '中心医院',
      }))
      resolve(data)
    }, 1000)
  })
}

export function computeFlight(payload: any): Promise<{ drone: string; eta: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ drone: '无人机 #03', eta: '18 分钟' })
    }, 1200)
  })
}

export function fetchTaskDetail(id: string | number): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id,
        progress: 60,
        waybill: { code: 'WB20251210001', weight: '3.2kg' },
        logs: [
          { time: '10:00', text: '任务创建' },
          { time: '10:05', text: '起飞' },
          { time: '10:20', text: '途中巡航' },
        ],
      })
    }, 800)
  })
}
