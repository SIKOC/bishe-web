export function fetchDroneList(): Promise<any[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const list = Array.from({ length: 8 }, (_, i) => ({
        id: i + 1,
        name: `DR-${100 + i}`,
        battery: Math.floor(Math.random() * 60) + 40,
        signal: Math.floor(Math.random() * 60) + 40,
        status: ['待命', '执行中', '维护中'][i % 3],
      }))
      resolve(list)
    }, 900)
  })
}

export function fetchMaintenance(): Promise<any[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, drone: 'DR-101', type: '更换电池', time: '2025-12-09 11:20' },
        { id: 2, drone: 'DR-102', type: '维修电机', time: '2025-12-08 16:40' },
      ])
    }, 700)
  })
}

export function fetchLocations(): Promise<any[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        { id: 1, name: '市立医院', lat: 31.23, lng: 121.47 },
        { id: 2, name: '中心医院', lat: 31.2, lng: 121.45 },
      ])
    }, 600)
  })
}
