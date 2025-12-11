// Mock 工具：提供延迟函数，模拟网络请求延迟
export function delay<T>(data: T, ms = 600): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}
