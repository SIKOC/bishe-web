import request from '@/utils/request'

export async function fetchDrones(params?: any) {
  const res: any = await request.get('/drone/drones', { params: { page: params?.page || 1, size: params?.pageSize || 10, status: params?.status } })
  return { total: res?.data?.total || res?.total || 0, list: (res?.data?.list || res?.list || []).map((d: any) => ({
    id: d.drone_id,
    model: d.drone_code,
    battery: d.battery_level,
    status: d.status,
    lastLocation: '',
  })) }
}

export async function createDrone(payload: any) {
  // 简化：后台暂不提供新增接口，这里直接返回
  return Promise.resolve(payload)
}

export async function updateDrone(id: string, payload: any) {
  return request.put(`/drone/drones/${id}`, payload)
}

export async function deleteDrone(id: string) {
  // 简化：后台暂不提供删除接口，这里直接返回成功
  return Promise.resolve(true)
}
