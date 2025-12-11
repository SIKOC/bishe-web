// 无人机相关模拟 API
import { Drone } from '../types'
import { delay } from './mock'

const mockDrones: Drone[] = Array.from({ length: 23 }).map((_, i) => ({
  id: `${1000 + i}`,
  model: ['X1', 'X2', 'Y7', 'Z3'][i % 4],
  battery: Math.floor(Math.random() * 80) + 10,
  status: ['idle', 'flying', 'maintenance'][i % 3],
  lastLocation: `${(116 + Math.random()).toFixed(4)}, ${(39 + Math.random()).toFixed(4)}`,
}))

export function fetchDrones(params?: any) {
  // 忽略搜索参数，直接返回分页模拟
  const page = params?.page || 1
  const pageSize = params?.pageSize || 10
  const start = (page - 1) * pageSize
  const list = mockDrones.slice(start, start + pageSize)
  return delay({ total: mockDrones.length, list }, 600)
}

export function createDrone(payload: Partial<Drone>) {
  // 模拟新增
  const newDrone: Drone = {
    id: String(Date.now()),
    model: payload.model || 'X1',
    battery: payload.battery ?? 100,
    status: payload.status || 'idle',
    lastLocation: payload.lastLocation || '0,0',
  }
  mockDrones.unshift(newDrone)
  return delay(newDrone, 600)
}

export function updateDrone(id: string, payload: Partial<Drone>) {
  const idx = mockDrones.findIndex((d) => d.id === id)
  if (idx >= 0) {
    mockDrones[idx] = { ...mockDrones[idx], ...payload }
    return delay(mockDrones[idx], 400)
  }
  return Promise.reject(new Error('Not found'))
}

export function deleteDrone(id: string) {
  const idx = mockDrones.findIndex((d) => d.id === id)
  if (idx >= 0) {
    mockDrones.splice(idx, 1)
    return delay(true, 300)
  }
  return Promise.reject(new Error('Not found'))
}
