import request from '@/utils/request'

export async function fetchDroneList(): Promise<any[]> {
  const res: any = await request.get('/drone/drones', { params: { page: 1, size: 50 } })
  return (res?.data?.list || res?.list || []).map((d: any) => ({
    id: d.drone_id,
    name: d.drone_code,
    battery: d.battery_level,
    signal: 100,
    status: d.status,
  }))
}

export async function fetchMaintenance(): Promise<any[]> {
  const res: any = await request.get('/drone/maintenance', { params: { page: 1, size: 50 } })
  return (res?.data?.list || res?.list || []).map((m: any) => ({
    id: m.record_id,
    drone: m.drone_id,
    type: m.maintenance_type,
    time: m.maintenance_time,
  }))
}

export async function fetchLocations(): Promise<any[]> {
  const res: any = await request.get('/hospital/list')
  return (res?.data || res || []).map((h: any) => ({ id: h.hospital_id, name: h.name, lat: h.lat, lng: h.lng }))
}
