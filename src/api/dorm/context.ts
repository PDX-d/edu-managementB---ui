import { getAccessToken, getCurrentUserId, getTenantId, getVisitTenantId } from '@/utils/auth'
import { useUserStoreWithOut } from '@/store/modules/user'

let observed = ''
let epoch = 0
export const dormContext = () => {
  const user = String(useUserStoreWithOut().getUser?.id ?? '')
  const stored = String(getCurrentUserId() ?? '')
  const valid = !!getAccessToken() && !!user && user === stored
  const signature = JSON.stringify([user, stored, getTenantId(), getVisitTenantId(), valid])
  if (signature !== observed) {
    observed = signature
    epoch++
  }
  return valid ? `${epoch}:${signature}` : ''
}
export const scoped = async <T>(run: () => Promise<T>): Promise<T> => {
  const context = dormContext()
  if (!context) throw new Error('登录身份已变化，请重新进入页面')
  try {
    return await run()
  } finally {
    if (context !== dormContext()) throw new Error('登录身份已变化，已丢弃旧请求结果')
  }
}
