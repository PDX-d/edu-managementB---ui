import { ElMessage, ElMessageBox } from 'element-plus'
import type { Ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { useUserStoreWithOut } from '@/store/modules/user'
import { checkPermi } from '@/utils/permission'
import { dormContext } from '@/api/dorm/context'
import * as Api from '@/api/dorm'
import type { Id, Query, References } from '@/api/dorm/types'
import { formatBizTime, parseBizTime } from '@/views/timetable/utils'

export { formatBizTime, parseBizTime }
export const key = (id?: Id | null) => String(id ?? '')
export const can = (name: string) => checkPermi([`dorm:${name}`])
export const query = (): Query => ({ pageNo: 1, pageSize: 10 })
export const today = () => formatBizTime(Date.now(), 'YYYY-MM-DD')
export const money = (value?: number | string | null) =>
  value == null ? '—' : Number(value).toFixed(2)
export const version = (data: { id: Id; rowVersion: Id }) => ({
  id: data.id,
  rowVersion: data.rowVersion
})
export const labels: Record<string, string> = {
  MALE: '男',
  FEMALE: '女',
  UNLIMITED: '不限',
  UNKNOWN: '未登记',
  RESERVED: '待入住',
  OCCUPIED: '已入住',
  CHECKED_OUT: '已退宿',
  CANCELLED: '已取消',
  PENDING: '待处理',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  NOT_REQUIRED: '无需退款',
  REFUNDED: '已退款',
  PRESENT: '在寝',
  ABSENT: '不在寝',
  STUDENT: '学生申请',
  STAFF: '工作人员调整',
  ADMIN: '管理员',
  COUNSELOR: '辅导员',
  OUTSIDE: '在外',
  RETURNED: '已返校'
}
export const label = (value?: string) => (value ? (labels[value] ?? value) : '—')
export const confirmAction = async (message: string) => {
  const context = dormContext()
  if (!context) return false
  try {
    await ElMessageBox.confirm(message, '提示', { type: 'warning' })
  } catch {
    return false
  }
  return context === dormContext()
}
export const confirmDiscard = async (dirty: boolean) => {
  if (!dirty) return true
  try {
    await ElMessageBox.confirm('尚有未保存修改，确定放弃？', '提示', { type: 'warning' })
    return true
  } catch {
    return false
  }
}
export const useUnsavedGuard = (dirty: Ref<boolean>, busy?: Ref<boolean>) => {
  onBeforeRouteLeave(() => (busy?.value ? false : confirmDiscard(dirty.value)))
  const unload = (event: BeforeUnloadEvent) => {
    if (dirty.value || busy?.value) {
      event.preventDefault()
      event.returnValue = ''
    }
  }
  onMounted(() => window.addEventListener('beforeunload', unload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', unload))
}
export const useScopeReset = (reset: () => void) => {
  let context = dormContext()
  const check = () => {
    const next = dormContext()
    if (next !== context) {
      context = next
      reset()
    }
  }
  watch(() => useUserStoreWithOut().getUser?.id, check, { flush: 'sync' })
  onMounted(() => {
    window.addEventListener('storage', check)
    window.addEventListener('focus', check)
  })
  onActivated(check)
  onBeforeUnmount(() => {
    window.removeEventListener('storage', check)
    window.removeEventListener('focus', check)
  })
}
export const useDormReferences = () => {
  const options = ref<References>()
  const loading = ref(false)
  const failed = ref(false)
  let revision = 0
  const load = async () => {
    const rev = ++revision
    loading.value = true
    failed.value = false
    options.value = undefined
    try {
      if (!can('reference:query')) throw new Error('没有公共选项查询权限')
      const result = await Api.references()
      if (rev === revision) options.value = result
    } catch {
      if (rev === revision) failed.value = true
    } finally {
      if (rev === revision) loading.value = false
    }
  }
  useScopeReset(() => {
    revision++
    options.value = undefined
    failed.value = true
    loading.value = false
  })
  onBeforeUnmount(() => revision++)
  onMounted(load)
  const admin = computed(() => can('admin'))
  const staff = computed(() => admin.value || options.value?.actorType === 'COUNSELOR')
  const student = computed(() => options.value?.actorType === 'STUDENT')
  return { options, loading, failed, load, admin, staff, student }
}
export const useDormList = <T>(
  params: Query,
  read: (q: Query) => Promise<PageResult<T[]>>,
  permission: string
) => {
  const rows = shallowRef<T[]>([])
  const total = ref(0)
  const loading = ref(false)
  const failed = ref(false)
  let revision = 0
  const load = async () => {
    const rev = ++revision
    loading.value = true
    failed.value = false
    try {
      if (!can(permission)) throw new Error('没有查询权限')
      const sent = { ...params }
      let result = await read(sent)
      const last = Math.max(1, Math.ceil(result.total / sent.pageSize))
      if (sent.pageNo > last && rev === revision) {
        params.pageNo = last
        result = await read({ ...sent, pageNo: last })
      }
      if (rev === revision) {
        rows.value = result.list
        total.value = result.total
      }
    } catch {
      if (rev === revision) {
        rows.value = []
        total.value = 0
        failed.value = true
      }
    } finally {
      if (rev === revision) loading.value = false
    }
  }
  const search = () => {
    params.pageNo = 1
    return load()
  }
  const reset = () => {
    Object.assign(params, query(), {
      keyword: undefined,
      studentId: undefined,
      classId: undefined,
      buildingId: undefined,
      roomId: undefined,
      stayId: undefined,
      status: undefined,
      startDate: undefined,
      endDate: undefined
    })
    return load()
  }
  useScopeReset(() => {
    revision++
    rows.value = []
    total.value = 0
    loading.value = false
    failed.value = true
  })
  onBeforeUnmount(() => revision++)
  onMounted(load)
  return { rows, total, loading, failed, load, search, reset }
}
export const useDormDialog = <T extends object>(initial: () => T) => {
  const visible = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const ready = ref(false)
  const data = ref(initial()) as Ref<T>
  const baseline = ref('')
  const dirty = computed(() => ready.value && JSON.stringify(data.value) !== baseline.value)
  useUnsavedGuard(dirty, saving)
  let revision = 0
  const open = async (read?: () => Promise<T>) => {
    if (saving.value) return
    const rev = ++revision
    data.value = initial()
    ready.value = false
    visible.value = true
    loading.value = true
    try {
      const result = read ? await read() : initial()
      if (rev === revision && visible.value) {
        data.value = result
        baseline.value = JSON.stringify(result)
        ready.value = true
      }
    } catch {
      if (rev === revision) ElMessage.error('加载失败，请关闭后重试')
    } finally {
      if (rev === revision) loading.value = false
    }
  }
  const close = async () => {
    if (saving.value) return
    const rev = revision
    if (dirty.value) {
      try {
        await ElMessageBox.confirm('尚有未保存修改，确定放弃并关闭？', '提示', { type: 'warning' })
      } catch {
        return
      }
    }
    if (rev === revision && !saving.value) visible.value = false
  }
  const execute = async (
    write: (value: T) => Promise<unknown>,
    permission: string,
    success: () => void
  ) => {
    if (!ready.value || loading.value || saving.value || !can(permission)) return
    const rev = revision
    const context = dormContext()
    if (!context) return
    saving.value = true
    try {
      await write(data.value)
      if (rev === revision && visible.value && context === dormContext()) {
        baseline.value = JSON.stringify(data.value)
        visible.value = false
        ElMessage.success('操作成功')
        success()
      }
    } catch {
      return
    } finally {
      if (rev === revision) saving.value = false
    }
  }
  watch(
    visible,
    (value) => {
      if (!value) {
        revision++
        data.value = initial()
        ready.value = false
        loading.value = false
        saving.value = false
      }
    },
    { flush: 'sync' }
  )
  useScopeReset(() => {
    revision++
    visible.value = false
    data.value = initial()
    ready.value = false
    saving.value = false
  })
  onBeforeUnmount(() => revision++)
  return { visible, loading, saving, ready, data, dirty, open, close, execute }
}
