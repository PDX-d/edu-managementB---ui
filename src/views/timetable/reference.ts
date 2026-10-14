import {
  findSemester,
  getReferenceOptions,
  type ReferenceOptions,
  type SemesterOption
} from '@/api/timetable/reference'
import type { LessonVO } from '@/api/timetable/lesson'
import type { TimetableDateRange, TimetableId } from '@/api/timetable/types'
import { checkPermi } from '@/utils/permission'
import dayjs from 'dayjs'
import { addDays, DATE_FORMAT, idKey, parseBizTime } from './utils'

/** 组件内使用公共选项：请求结果由适配层按账号缓存，多个组件共享同一次加载 */
export const useReferenceOptions = () => {
  const options = ref<ReferenceOptions | null>(null)
  const loading = ref(false)
  const failed = ref(false)
  const load = async (force = false) => {
    loading.value = true
    failed.value = false
    try {
      options.value = await getReferenceOptions(force)
    } catch {
      // 具体错误已由请求封装提示，这里只记录失败状态，不回退为任何编造名单
      options.value = null
      failed.value = true
    } finally {
      loading.value = false
    }
  }
  const semesterOf = (semesterId?: TimetableId | null): SemesterOption | undefined =>
    options.value ? findSemester(options.value, idKey(semesterId) || undefined) : undefined
  return { options, loading, failed, load, semesterOf }
}

export const semesterRange = (semester?: SemesterOption | null): TimetableDateRange | null =>
  semester ? { startDate: semester.startDate, endDate: semester.endDate } : null

/** 学期允许的课次时间边界：开始不早于首日 00:00，结束不晚于末日次日 00:00（与后端一致） */
export const semesterTimeBounds = (semester: SemesterOption) => ({
  start: parseBizTime(`${semester.startDate} 00:00:00`),
  end: parseBizTime(`${addDays(semester.endDate, 1)} 00:00:00`)
})

/** 课次时间校验（毫秒时间戳），通过返回空字符串 */
export const checkLessonTime = (start: number, end: number, semester?: SemesterOption | null) => {
  if (start >= end) return '结束时间必须晚于开始时间'
  if (semester) {
    const bounds = semesterTimeBounds(semester)
    if (start < bounds.start || end > bounds.end) {
      return `课次时间必须位于学期内（${semester.startDate} 00:00 至 ${addDays(semester.endDate, 1)} 00:00）`
    }
  }
  return ''
}

/** 日期选择器的学期限制；allowNextDay 用于结束时间可取末日次日 00:00 */
export const semesterDisabledDate =
  (semester: SemesterOption | null | undefined, allowNextDay = false) =>
  (date: Date) => {
    if (!semester) return false
    const day = dayjs(date).format(DATE_FORMAT)
    const last = allowNextDay ? addDays(semester.endDate, 1) : semester.endDate
    return day < semester.startDate || day > last
  }

/** 把日期夹取到区间内 */
export const clampDate = (date: string, range: TimetableDateRange): string => {
  if (date < range.startDate) return range.startDate
  if (date > range.endDate) return range.endDate
  return date
}

/** 学期选项展示名称 */
export const semesterLabel = (semester: SemesterOption) =>
  `${semester.name}（${semester.startDate} ~ ${semester.endDate}）${semester.archived ? '【已归档】' : ''}`

export type RescheduleAction = 'update' | 'apply'

/**
 * 课次可执行的改期方式（用于拖拽及按钮入口的界面判断，最终以后端校验为准）
 * - 管理员：需 timetable:lesson:update
 * - 辅导员：需 timetable:lesson:update，且原课次全部班级都在本人管理范围内（合班需全部满足）
 * - 教师：需 timetable:change-request:create，只能针对本人尚未开始的正常课次，走调课申请
 * - 学生及其他：不可改期
 */
export const rescheduleAction = (
  options: ReferenceOptions | null,
  lesson: LessonVO,
  readonly: boolean
): RescheduleAction | null => {
  if (!options || readonly || lesson.status !== 0) return null
  const actor = options.actor
  if (actor.type === 'ADMIN') {
    return checkPermi(['timetable:lesson:update']) ? 'update' : null
  }
  if (actor.type === 'COUNSELOR') {
    const managed = new Set((actor.classIds || []).map((id) => idKey(id)))
    const classIds = lesson.classIds || []
    const all = classIds.length > 0 && classIds.every((id) => managed.has(idKey(id)))
    return all && checkPermi(['timetable:lesson:update']) ? 'update' : null
  }
  if (actor.type === 'TEACHER') {
    const own = !!idKey(actor.teacherId) && idKey(actor.teacherId) === idKey(lesson.teacherId)
    return own && lesson.startTime > Date.now() && checkPermi(['timetable:change-request:create'])
      ? 'apply'
      : null
  }
  return null
}
