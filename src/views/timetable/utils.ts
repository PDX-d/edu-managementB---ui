import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import type { TimetableDateRange, TimetableId } from '@/api/timetable/types'
import type { LessonDimension } from '@/api/timetable/lesson'

dayjs.extend(utc)
dayjs.extend(timezone)

/**
 * 学院业务时区
 *
 * 后端用 ZoneId.systemDefault() 在 LocalDateTime 与毫秒时间戳之间转换，部署时区为 Asia/Shanghai，
 * 因此前端固定按该时区展示和换算，避免浏览器所在时区不同导致日期偏移。
 */
export const BIZ_TIMEZONE = 'Asia/Shanghai'
export const DATE_FORMAT = 'YYYY-MM-DD'
export const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss'

/** 毫秒时间戳 → 业务时区字符串 */
export const formatBizTime = (ts?: number | null, format = DATE_TIME_FORMAT): string => {
  if (ts === undefined || ts === null) return ''
  return dayjs(ts).tz(BIZ_TIMEZONE).format(format)
}

/** 业务时区的 "YYYY-MM-DD HH:mm:ss" → 毫秒时间戳 */
export const parseBizTime = (value: string): number => dayjs.tz(value, BIZ_TIMEZONE).valueOf()

/** 时间段展示：同日只显示一次日期，跨日显示完整起止 */
export const formatBizRange = (start?: number | null, end?: number | null): string => {
  if (start === undefined || start === null || end === undefined || end === null) return '-'
  const startDate = formatBizTime(start, DATE_FORMAT)
  const endDate = formatBizTime(end, DATE_FORMAT)
  if (startDate === endDate) {
    return `${startDate} ${formatBizTime(start, 'HH:mm')} ~ ${formatBizTime(end, 'HH:mm')}`
  }
  return `${formatBizTime(start, 'YYYY-MM-DD HH:mm')} ~ ${formatBizTime(end, 'YYYY-MM-DD HH:mm')}`
}

/** 业务时区的今天 */
export const bizToday = (): string => dayjs().tz(BIZ_TIMEZONE).format(DATE_FORMAT)

// ========== 纯日期（YYYY-MM-DD）计算 ==========

export const addDays = (date: string, days: number): string =>
  dayjs(date).add(days, 'day').format(DATE_FORMAT)

/** 两个日期相差的天数（end - start） */
export const diffDays = (start: string, end: string): number => dayjs(end).diff(dayjs(start), 'day')

/** ISO 星期：星期一为 1，星期日为 7 */
export const isoWeekday = (date: string): number => dayjs(date).day() || 7

/** 所在周的星期一 */
export const weekStart = (date: string): string => addDays(date, 1 - isoWeekday(date))

/** 列出 [start, end] 内的全部日期 */
export const enumerateDates = (start: string, end: string): string[] => {
  const dates: string[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) {
    dates.push(d)
  }
  return dates
}

/** 求两个日期区间的交集，无交集返回 null；b 为空表示不限制 */
export const intersectRange = (
  a: TimetableDateRange,
  b?: TimetableDateRange | null
): TimetableDateRange | null => {
  if (!b) return a
  const startDate = a.startDate > b.startDate ? a.startDate : b.startDate
  const endDate = a.endDate < b.endDate ? a.endDate : b.endDate
  return startDate <= endDate ? { startDate, endDate } : null
}

// 下标即 ISO 星期（1-7），下标 0 占位
export const WEEKDAY_LABELS = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

// ========== ID 规范化 ==========

const MAX_LONG = 9223372036854775807n

/** ID 统一转为字符串键，用于比较、去重 */
export const idKey = (id?: TimetableId | null): string =>
  id === undefined || id === null ? '' : String(id).trim()

/** 是否为后端 Long 范围内的正整数 ID */
export const isPositiveId = (value?: TimetableId | null): boolean => {
  const key = idKey(value)
  return /^[1-9]\d{0,18}$/.test(key) && BigInt(key) <= MAX_LONG
}

/** 提交给后端的 ID：安全整数范围内用 number，否则保留字符串以免丢失精度 */
export const toIdValue = (id: TimetableId): TimetableId => {
  const key = idKey(id)
  const value = Number(key)
  return Number.isSafeInteger(value) ? value : key
}

/** 按规范化后的键去重，保留首次出现的顺序 */
export const uniqueIds = (ids: TimetableId[]): string[] => {
  return Array.from(new Set(ids.map((id) => idKey(id)).filter(Boolean)))
}

/** el-form 的正整数 ID 校验规则 */
export const idRule = (label: string, required = true) => ({
  required,
  trigger: 'blur',
  validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    if (!idKey(value)) {
      return required ? callback(new Error(`${label}不能为空`)) : callback()
    }
    if (!isPositiveId(value)) {
      return callback(new Error(`${label}必须是正整数`))
    }
    callback()
  }
})

// ========== 枚举 ==========

export const LESSON_STATUS_OPTIONS = [
  { value: 0, label: '正常' },
  { value: 1, label: '停课' }
]

export const CLASSROOM_STATUS_OPTIONS = [
  { value: 0, label: '启用' },
  { value: 1, label: '停用' }
]

export const CHANGE_STATUS_OPTIONS = [
  { value: 0, label: '待审批', tagType: 'warning' },
  { value: 1, label: '已通过', tagType: 'success' },
  { value: 2, label: '已拒绝', tagType: 'danger' }
] as const

export const CHANGE_TYPE_LABELS: Record<string, string> = {
  CHANGE: '调课',
  CANCEL: '停课'
}

export const CONFLICT_TYPE_LABELS: Record<string, string> = {
  TEACHER: '教师时间冲突',
  CLASSROOM: '教室占用冲突',
  CLASS: '班级时间冲突'
}

export const DIMENSION_OPTIONS: { value: LessonDimension; label: string }[] = [
  { value: 'SELF', label: '本人相关' },
  { value: 'CLASS', label: '按班级' },
  { value: 'CLASSROOM', label: '按教室' }
]

// ========== 导出文件 ==========

/** 导出接口返回的不是预期文件（如 JSON 错误） */
export class ExportFileError extends Error {}

/**
 * 保存后端导出的 PNG / PDF
 *
 * 共享请求封装只拦截 Content-Type 恰为 application/json 的错误响应，带 charset 的 JSON 仍会作为 Blob 返回，
 * 因此这里先核对 MIME 类型，不匹配时解析错误信息并抛出，绝不把 JSON 保存成 PNG/PDF。
 */
export const saveExportFile = async (data: Blob, fileName: string, mimeType: string) => {
  if (!(data instanceof Blob) || !data.type.startsWith(mimeType)) {
    let msg = '导出失败：服务端未返回有效文件'
    try {
      const json = JSON.parse(await (data as Blob).text())
      if (json?.msg) msg = json.msg
    } catch {}
    throw new ExportFileError(msg)
  }
  const href = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.click()
  // 下载已由浏览器接管，释放 Object URL
  setTimeout(() => URL.revokeObjectURL(href))
}
