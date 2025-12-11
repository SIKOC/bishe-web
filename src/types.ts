export interface Drone {
  id: string
  model: string
  battery: number
  status: 'idle' | 'flying' | 'maintenance' | string
  lastLocation: string
}
