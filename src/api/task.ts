import request from '@/utils/request'

export async function fetchTaskList(params?: any): Promise<{ list: any[]; total: number }> {
  const res: any = await request.get('/task/tasks', { params })
  const rawList = res?.data?.list || res?.list || []
  const total = res?.data?.total ?? (Array.isArray(rawList) ? rawList.length : 0)
  const list = rawList.map((t: any) => ({
    id: t.task_id,
    name: t.name || `任务-${t.task_id}`,
    status:
      (
        {
          pending: '待调度',
          in_progress: '飞行中',
          completed: '已完成',
          canceled: '已取消',
          pending_review: '待审核',
        } as Record<string, string>
      )[t.status] || t.status,
    // 统一返回中文优先级标签
    priority: ['低', '中', '高'][Math.min(Math.max((Number(t.priority) || 3) - 1, 0), 2)],
    time: t.request_time || t.created_at || t.time,
    originName: t.origin_name || t.origin || '',
    destinationName: t.destination_name || t.destination || '',
    origin: t.origin_hospital_id,
    target: t.destination_hospital_id,
    auditStatus: t.audit_status ?? t.status,
    raw: t,
  }))
  return { list, total }
}

export async function fetchTaskDetail(id: string | number): Promise<any> {
  const t: any = await request.get(`/task/tasks/${id}`)
  return t
}

export async function createTask(payload: any): Promise<any> {
  // Pass through all fields including coordinates
  return request.post('/task/tasks', payload)
}

export async function auditTask(
  id: number,
  auditStatus: string,
  originHospitalId?: number,
): Promise<any> {
  return request.put(`/task/tasks/${id}/audit`, { auditStatus, originHospitalId })
}

export async function assignTask(id: number, droneId: number): Promise<any> {
  return request.put(`/task/tasks/${id}/assign`, null, { params: { droneId } })
}

export async function updateTaskStatus(id: number, status: string): Promise<any> {
  return request.put(`/task/tasks/${id}/status`, null, { params: { status } })
}

/**
 * 获取任务实时轨迹
 */
export async function getTaskTrack(taskId: number): Promise<{
  route: Array<{ lng: number; lat: number; timestamp: number }>
  currentPosition: {
    lng: number
    lat: number
    altitude?: number
    speed?: number
    heading?: number
  }
}> {
  const res: any = await request.get(`/task/tasks/${taskId}/track`)
  return res?.data || res
}
