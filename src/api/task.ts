import request from '@/utils/request'

export async function fetchTaskList(params?: any): Promise<any[]> {
  const res: any = await request.get('/task/tasks', { params })
  return (res?.data?.list || res?.list || []).map((t: any) => ({
    id: t.task_id,
    name: `任务-${t.task_id}`,
    status: (
      {
        pending: '待调度',
        in_progress: '飞行中',
        completed: '已完成',
        canceled: '已取消',
        pending_review: '待审核'
      } as Record<string, string>
    )[t.status] || t.status,
    priority: ['低', '中', '高'][Math.min(Math.max((t.priority || 3) - 1, 0), 2)],
    time: t.request_time,
    origin: t.origin_hospital_id,
    target: t.destination_hospital_id,
    auditStatus: t.audit_status
  }))
}

export async function fetchTaskDetail(id: string | number): Promise<any> {
  const t: any = await request.get(`/task/tasks/${id}`)
  return t
}

export async function createTask(payload: any): Promise<any> {
  // Pass through all fields including coordinates
  return request.post('/task/tasks', payload)
}

export async function auditTask(id: number, auditStatus: string, originHospitalId?: number): Promise<any> {
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