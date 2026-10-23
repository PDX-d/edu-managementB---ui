import type { ExamId, ExamQuery, References, Semester } from '@/api/exam/types'
import { getReferences } from '@/api/exam'
import { examContext } from '@/api/exam/sync'
import { checkPermi } from '@/utils/permission'
import { addDays, parseBizTime, formatBizTime, saveExportFile } from '@/views/timetable/utils'

export { parseBizTime, formatBizTime, saveExportFile }
export const key = (id?: ExamId | null) => String(id ?? '')
export const can = (permission: string) => checkPermi([`exam:${permission}`])
export const defaultQuery = (): ExamQuery => ({ pageNo: 1, pageSize: 10 })
export const getExamPage = async <T>(
  params: ExamQuery,
  read: (query: ExamQuery) => Promise<PageResult<T[]>>
) => {
  let data = await read(params)
  const lastPage = Math.max(1, Math.ceil(data.total / (params.pageSize ?? 10)))
  if ((params.pageNo ?? 1) > lastPage) {
    params.pageNo = lastPage
    data = await read(params)
  }
  return data
}
export const useExam = () => {
  const options = ref<References>()
  const loading = ref(false)
  const failed = ref(false)
  let revision = 0
  const load = async () => {
    const current = ++revision
    const context = examContext()
    loading.value = true
    failed.value = false
    options.value = undefined
    try {
      if (!can('reference:query')) throw new Error('没有公共选项查询权限')
      const data = await getReferences()
      if (current === revision && context.stamp === examContext().stamp) options.value = data
    } catch {
      if (current === revision && context.stamp === examContext().stamp) failed.value = true
    } finally {
      if (current === revision && context.stamp === examContext().stamp) loading.value = false
    }
  }
  const semesterOf = (id?: ExamId) => options.value?.semesters.find((s) => key(s.id) === key(id))
  return { options, loading, failed, load, semesterOf }
}
export const timeError = (start: string, end: string, semester?: Semester) => {
  const from = parseBizTime(start)
  const to = parseBizTime(end)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to)
    return '请选择有效的起止时间，结束须晚于开始'
  if (!semester) return '学期数据不可用，请重新加载'
  if (
    from < parseBizTime(`${semester.startDate} 00:00:00`) ||
    to > parseBizTime(`${addDays(semester.endDate, 1)} 00:00:00`)
  )
    return '考试时间必须位于所选学期内'
  return ''
}
export const sessionLocked = (s: {
  archived: boolean
  participantsLocked: boolean
  startTime: string
}) => s.archived || s.participantsLocked || Date.now() >= parseBizTime(s.startTime)
export const validateItems = (items: { name: string; weight: number }[]) => {
  if (
    !items.length ||
    items.some(
      (i) =>
        !i.name.trim() ||
        i.name.trim().length > 50 ||
        !Number.isFinite(i.weight) ||
        i.weight < 0 ||
        i.weight > 100
    )
  )
    return '分项名称必填，权重应在 0～100 之间'
  if (new Set(items.map((i) => i.name.trim())).size !== items.length) return '分项名称不能重复'
  if (items.some((i) => Math.abs(i.weight * 100 - Math.round(i.weight * 100)) > 0.000001))
    return '权重最多保留两位小数'
  if (items.reduce((sum, i) => sum + Math.round(i.weight * 100), 0) !== 10000)
    return '分项权重合计必须为 100%'
  return ''
}
