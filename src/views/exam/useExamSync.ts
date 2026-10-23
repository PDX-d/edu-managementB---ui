import { watch, ref, onMounted, onActivated, onDeactivated, onBeforeUnmount } from 'vue'
import { useUserStoreWithOut } from '@/store/modules/user'
import { examContext, subscribeExamChanges, type ExamChange } from '@/api/exam/sync'

export const useExamSync = (options: {
  matches: (change: ExamChange) => boolean
  reload: () => Promise<unknown>
  reset: () => void
  dirty?: () => boolean
  busy?: () => boolean
  enabled?: () => boolean
}) => {
  const stale = ref(false)
  const active = ref(true)
  let generation = 0
  let attempted = -1
  let running = false
  let confirming = false
  let activated = false
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let previous = examContext()
  const eligible = () =>
    !disposed &&
    active.value &&
    document.visibilityState === 'visible' &&
    previous.valid &&
    options.enabled?.() !== false &&
    !options.busy?.()
  const checkpoint = () => ({ generation, stamp: examContext().stamp })
  const settled = (ticket: ReturnType<typeof checkpoint>) => {
    if (ticket.stamp === examContext().stamp && ticket.generation === generation)
      stale.value = false
  }
  const queue = () => {
    if (
      timer ||
      running ||
      !stale.value ||
      generation === attempted ||
      !eligible() ||
      options.dirty?.()
    )
      return
    timer = setTimeout(() => {
      timer = undefined
      void run()
    }, 150)
  }
  const run = async (manual = false) => {
    if (!eligible() || running || confirming || (!manual && options.dirty?.())) return
    const confirmationScope = previous.stamp
    if (manual && options.dirty?.()) {
      confirming = true
      try {
        await useMessage().confirm('数据已更新，确认放弃未保存修改并刷新？')
      } catch {
        return
      } finally {
        confirming = false
      }
      if (!eligible() || confirmationScope !== previous.stamp) return
    }
    attempted = generation
    const current = generation
    const stamp = previous.stamp
    running = true
    try {
      await options.reload()
    } catch {
    } finally {
      running = false
      if (current !== generation || stamp !== previous.stamp) queue()
    }
  }
  const invalidate = () => {
    generation++
    stale.value = true
    queue()
  }
  const checkContext = () => {
    const current = examContext()
    if (current.stamp === previous.stamp) return
    const changedScope = !current.valid || current.scope !== previous.scope
    previous = current
    generation++
    stale.value = true
    if (changedScope) options.reset()
    queue()
  }
  const unsubscribe = subscribeExamChanges((change) => {
    checkContext()
    if (change && options.matches(change)) invalidate()
  })
  const foreground = () => {
    checkContext()
    if (active.value && document.visibilityState === 'visible') invalidate()
  }
  watch(() => useUserStoreWithOut().getUser.id, checkContext, { flush: 'sync' })
  watch(() => [options.busy?.(), options.dirty?.(), options.enabled?.()], queue)
  onMounted(() => {
    window.addEventListener('focus', foreground)
    document.addEventListener('visibilitychange', foreground)
  })
  onActivated(() => {
    active.value = true
    checkContext()
    if (activated) invalidate()
    activated = true
    queue()
  })
  onDeactivated(() => {
    active.value = false
    if (timer) clearTimeout(timer)
    timer = undefined
  })
  onBeforeUnmount(() => {
    disposed = true
    if (timer) clearTimeout(timer)
    unsubscribe()
    window.removeEventListener('focus', foreground)
    document.removeEventListener('visibilitychange', foreground)
  })
  return {
    stale,
    checkpoint,
    settled,
    isCurrent: (ticket: ReturnType<typeof checkpoint>) =>
      !disposed && ticket.stamp === examContext().stamp,
    refresh: () => run(true)
  }
}
