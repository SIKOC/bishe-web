import request from '@/utils/request'

export async function fetchDroneList(): Promise<any[]> {
  const [listRes, liveRes] = await Promise.all([
    request.get('/drone/drones', { params: { page: 1, size: 50 } }),
    request.get('/drone/live')
  ])
  
  const list = listRes?.data?.list || listRes?.list || []
  const liveMap = new Map((liveRes?.data || liveRes || []).map((d: any) => [d.droneId, d]))
  
  return list.map((d: any) => {
    const live = liveMap.get(d.drone_id || d.droneId)
    return {
      ...d,
      id: d.drone_id,
      name: d.drone_code,
      drone_code: d.drone_code,
      model: d.model,
      capacity: d.max_load_kg,
      max_speed: d.max_speed_kmh,
      range_km: d.max_range_km,
      hospital_id: d.owner_hospital_id,
      
      // Dynamic data
      status: live?.status || (d.status ? 'idle' : 'maintenance'),
      battery_level: live?.batteryLevel,
      current_lng: live?.longitude,
      current_lat: live?.latitude
    }
  })
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
