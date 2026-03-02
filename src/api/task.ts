import request from '@/utils/request'

export async function fetchTaskList(params?: any): Promise<{ list: any[]; total: number }> {
  const res: any = await request.get('/task/tasks', { params })
  const rawList = res?.data?.list || res?.list || []
  const total = res?.data?.total ?? (Array.isArray(rawList) ? rawList.length : 0)
  const list = rawList.map((t: any) => ({
    id: t.taskId || t.task_id,
    name: t.taskNo || t.task_no || t.name || `任务-${t.taskId || t.task_id}`,
    status:
      (
        {
          pending: '待调度',
          pending_approval: '待审批',
          approved: '已审批',
          in_progress: '飞行中',
          completed: '已完成',
          canceled: '已取消',
          pending_review: '待审核',
        } as Record<string, string>
      )[t.status] || t.status,
    // 统一返回中文优先级标签
    priority: ['低', '中', '高'][Math.min(Math.max((Number(t.urgencyLevel || t.urgency_level || t.priority) || 3) - 1, 0), 2)],
    time: t.createTime || t.create_time || t.request_time || t.created_at || t.time,
    originName: t.originName || t.origin_name || t.origin || '',
    destinationName: t.destName || t.dest_name || t.destination_name || t.destination || '',
    origin: t.originId || t.origin_id || t.origin_hospital_id,
    target: t.destId || t.dest_id || t.destination_hospital_id,
    auditStatus: t.audit_status ?? t.status,
    raw: t,
  }))
  return { list, total }
}

export async function fetchTaskDetail(id: string | number): Promise<any> {
  const t: any = await request.get(`/task/tasks/${id}`)
  // Map snake_case to camelCase for frontend usage
  return {
    ...t,
    taskId: t.taskId || t.task_id,
    originName: t.originName || t.origin_name || t.origin_address || t.origin,
    destName: t.destName || t.destination_name || t.dest_address || t.destination,
    originAddress: t.originName || t.origin_address, // Fallback
    destAddress: t.destName || t.dest_address, // Fallback
    requestTime: t.createTime || t.request_time || t.created_at,
    expectedArrivalTime: null, // V7.0 removed this, use estTimeMin if needed
    actualArrivalTime: t.actualEndTime || t.actual_arrival_time,
    assignedDroneId: t.assignedDroneId || t.assigned_drone_id,
    droneCode: t.droneCode, // Might be enriched by backend or separate call
    // Ensure coordinates are available as numbers
    origin_lng: Number(t.originLng || t.origin_lng),
    origin_lat: Number(t.originLat || t.origin_lat),
    dest_lng: Number(t.destLng || t.dest_lng),
    dest_lat: Number(t.destLat || t.dest_lat),
    plannedPath: (t.plannedPathJson || t.planned_path_json) ? (typeof (t.plannedPathJson || t.planned_path_json) === 'string' ? JSON.parse(t.plannedPathJson || t.planned_path_json) : (t.plannedPathJson || t.planned_path_json)) : [],
    totalDistanceKm: t.totalDistanceKm || t.total_distance_km,
    estTimeMin: t.estTimeMin || t.est_time_min
  }
}

export async function createTask(payload: any): Promise<any> {
  // Pass through all fields including coordinates
  return request.post('/task/tasks', payload)
}

export async function updateTaskRoute(id: number, points: any): Promise<any> {
  return request.put(`/task/tasks/${id}/route`, { points })
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
