export type DroneMarker = {
  id: string
  lat: number
  lng: number
  label?: string
  status?: 'normal' | 'warning' | 'error'
}

