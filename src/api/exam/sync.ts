import rawRequest from '@/config/axios'
import { getAccessToken, getCurrentUserId, getTenantId, getVisitTenantId } from '@/utils/auth'
import { useUserStoreWithOut } from '@/store/modules/user'
import type { ExamId, ExamQuery } from './types'

export interface ExamChange {
  type: 'score' | 'config' | 'session' | 'venue' | 'check-in'
  action: 'created' | 'updated' | 'deleted'
  sessionId?: ExamId
  venueId?: ExamId
}
const storageKey = 'exam:invalidation:v1'
const listeners = new Set<(change?: ExamChange) => void>()
const seen = new Set<string>()
let observed = ''
let contextEpoch = 0
const emit = (change?: ExamChange) => {
  listeners.forEach((listener) => {
    try {
      listener(change)
    } catch {}
  })
}

const context = () => {
  const userId = getCurrentUserId()
  const localUser = useUserStoreWithOut().getUser.id
  const token = getAccessToken()
  const scope = JSON.stringify([
    String(userId),
    String(getTenantId() ?? ''),
    String(getVisitTenantId() ?? '')
  ])
  return {
    scope,
    identity: JSON.stringify([scope, String(localUser), !!token]),
    valid: !!token && !!userId && String(localUser) === String(userId)
  }
}
export const examContext = () => {
  const current = context()
  const changed = !!observed && observed !== current.identity
  if (observed !== current.identity) {
    observed = current.identity
    contextEpoch++
  }
  if (changed) emit()
  return {
    scope: current.scope,
    stamp: JSON.stringify([current.identity, contextEpoch]),
    valid: current.valid
  }
}
export class ExamContextChangedError extends Error {}
const beginRequest = () => {
  const before = contextEpoch
  const initialized = !!observed
  const current = examContext()
  if (!current.valid || (initialized && before !== contextEpoch))
    throw new ExamContextChangedError('账号或租户已变化，请重新查询')
  return current
}
export const assertExamContext = (previous: ReturnType<typeof examContext>) => {
  const current = examContext()
  if (!current.valid || current.stamp !== previous.stamp)
    throw new ExamContextChangedError('账号或租户已变化，请重新查询')
}
const scoped = async <T>(run: () => Promise<T>): Promise<T> => {
  const previous = beginRequest()
  try {
    return await run()
  } finally {
    assertExamContext(previous)
  }
}
type RequestOptions = Parameters<typeof rawRequest.get>[0]
export const examRequest = {
  get: <T>(options: RequestOptions) => scoped(() => rawRequest.get<T>(options)),
  post: <T>(options: RequestOptions) => scoped(() => rawRequest.post<T>(options)),
  put: <T>(options: RequestOptions) => scoped(() => rawRequest.put<T>(options)),
  delete: <T>(options: RequestOptions) => scoped(() => rawRequest.delete<T>(options)),
  download: <T>(options: RequestOptions) => scoped(() => rawRequest.download<T>(options))
}
const deliver = (value: unknown) => {
  if (!value || typeof value !== 'object') return
  const event = value as { version?: number; id?: string; scope?: string; change?: ExamChange }
  const current = examContext()
  const change = event.change
  if (
    !current.valid ||
    event.version !== 1 ||
    event.scope !== current.scope ||
    typeof event.id !== 'string' ||
    seen.has(event.id) ||
    !change
  )
    return
  if (
    !['score', 'config', 'session', 'venue', 'check-in'].includes(change.type) ||
    !['created', 'updated', 'deleted'].includes(change.action)
  )
    return
  if (
    [change.sessionId, change.venueId].some(
      (id) => id !== undefined && !/^[1-9]\d*$/.test(String(id))
    )
  )
    return
  seen.add(event.id)
  if (seen.size > 128) seen.delete(seen.values().next().value!)
  emit(change)
}
const storage = (event: StorageEvent) => {
  examContext()
  if (event.key !== storageKey || !event.newValue) return
  try {
    deliver(JSON.parse(event.newValue))
  } catch {}
}
export const subscribeExamChanges = (listener: (change?: ExamChange) => void) => {
  examContext()
  if (!listeners.size) window.addEventListener('storage', storage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.removeEventListener('storage', storage)
      seen.clear()
    }
  }
}
export const examMutation = async <T>(
  run: () => Promise<T>,
  change: ExamChange | ((result: T) => ExamChange),
  confirmed: (result: T) => boolean = (result) => result === true
) => {
  const previous = beginRequest()
  const result = await run()
  assertExamContext(previous)
  if (confirmed(result)) {
    const event = {
      version: 1,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      scope: previous.scope,
      change: typeof change === 'function' ? change(result) : change
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(event))
    } catch {}
    deliver(event)
  }
  return result
}
export const relatesToExam = (change: ExamChange, query: ExamQuery) =>
  change.type !== 'venue' &&
  (!query.sessionId || !change.sessionId || String(query.sessionId) === String(change.sessionId))
