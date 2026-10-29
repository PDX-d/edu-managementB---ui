import type { Position } from '@/api/dorm/types'

export const locate = (serverTime: number, receivedAt: number): Promise<Position> => {
  if (!window.isSecureContext || !navigator.geolocation)
    return Promise.reject(new Error('定位需要 HTTPS 或 localhost，以及支持定位的浏览器'))
  if (!Number.isFinite(serverTime) || !Number.isFinite(receivedAt))
    return Promise.reject(new Error('服务器时间不可用，无法校准定位时间'))
  const started = performance.now()
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const now = performance.now()
        const elapsed = now - receivedAt
        const c = position.coords
        if (now - started > 15000 || elapsed < 0 || !Number.isFinite(elapsed)) {
          reject(new Error('定位返回过晚，请重新获取'))
          return
        }
        if (
          ![c.latitude, c.longitude, c.accuracy].every(Number.isFinite) ||
          c.accuracy <= 0 ||
          c.accuracy > 99999999.99 ||
          Math.abs(c.latitude) > 90 ||
          Math.abs(c.longitude) > 180
        ) {
          reject(new Error('定位坐标或精度无效'))
          return
        }
        resolve({
          requestId: requestKey(),
          latitude: Number(c.latitude.toFixed(7)),
          longitude: Number(c.longitude.toFixed(7)),
          accuracy: Math.ceil(c.accuracy * 100) / 100,
          capturedAt: Math.floor(serverTime + elapsed)
        })
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? '定位权限被拒绝，请在浏览器中允许后重试'
              : error.code === 2
                ? '无法定位，请检查设备定位服务'
                : '定位超时，请重试'
          )
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  )
}
const requestKey = () => {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (v) => v.toString(16).padStart(2, '0')).join('')
}
export const validatePhoto = async (file: File) => {
  if (!file.size || file.size > 5 * 1024 * 1024) throw new Error('照片须大于 0 且不超过 5MB')
  const head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => head[i] === v)
  const jpeg = head[0] === 255 && head[1] === 216 && head[2] === 255
  if (!png && !jpeg) throw new Error('只支持真实 JPEG / PNG 图片')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('照片无法解码，请重新选择')
  })
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 20000000)
      throw new Error('照片不能超过 2000 万像素')
  } finally {
    bitmap.close()
  }
  return png ? 'image/png' : 'image/jpeg'
}
