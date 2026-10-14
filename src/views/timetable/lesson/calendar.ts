import dayjs from 'dayjs'
import type { LessonVO } from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import {
  addDays,
  DATE_FORMAT,
  enumerateDates,
  formatBizTime,
  idKey,
  parseBizTime,
  WEEKDAY_LABELS,
  isoWeekday,
  weekStart
} from '../utils'

export type CalendarMode = 'day' | 'week' | 'month'

/** 课次在某一天内的片段：跨日课次会拆成多段，保证凌晨、跨日数据都能落到对应日期 */
export interface LessonSegment {
  key: string
  lesson: LessonVO
  date: string
  startMin: number // 当天 00:00 起的分钟数
  endMin: number
  fromPrevDay: boolean
  toNextDay: boolean
  lane: number // 同时段重叠时所在的列
  lanes: number // 所在重叠组的总列数
}

/** 卡片最小展示时长（分钟），用于极短或异常数据的布局 */
export const MIN_LAYOUT_MINUTES = 20
// 防御异常数据导致的长循环
const MAX_SPAN_DAYS = 400

/** 视图对应的日期区间（月视图只取当月，不为补满网格扩大查询） */
export const viewRange = (mode: CalendarMode, anchor: string): TimetableDateRange => {
  if (mode === 'day') return { startDate: anchor, endDate: anchor }
  if (mode === 'week') {
    const startDate = weekStart(anchor)
    return { startDate, endDate: addDays(startDate, 6) }
  }
  return {
    startDate: dayjs(anchor).startOf('month').format(DATE_FORMAT),
    endDate: dayjs(anchor).endOf('month').format(DATE_FORMAT)
  }
}

/** 视图需要绘制的日期；月视图固定 6 周网格，网格内非当月日期不查询 */
export const displayDates = (mode: CalendarMode, anchor: string): string[] => {
  if (mode !== 'month') {
    const range = viewRange(mode, anchor)
    return enumerateDates(range.startDate, range.endDate)
  }
  const first = weekStart(viewRange('month', anchor).startDate)
  return enumerateDates(first, addDays(first, 41))
}

export const shiftAnchor = (mode: CalendarMode, anchor: string, step: number): string => {
  if (mode === 'day') return addDays(anchor, step)
  if (mode === 'week') return addDays(anchor, step * 7)
  return dayjs(anchor).add(step, 'month').startOf('month').format(DATE_FORMAT)
}

export const viewTitle = (mode: CalendarMode, anchor: string): string => {
  if (mode === 'day') return `${anchor} ${WEEKDAY_LABELS[isoWeekday(anchor)]}`
  if (mode === 'month') return dayjs(anchor).format('YYYY 年 MM 月')
  const range = viewRange('week', anchor)
  return `${range.startDate} ~ ${range.endDate}`
}

const dayStartMs = (date: string) => parseBizTime(`${date} 00:00:00`)

/** 按业务时区把课次切分到各日期 */
export const buildSegments = (
  lessons: LessonVO[],
  dates: string[]
): Record<string, LessonSegment[]> => {
  const result: Record<string, LessonSegment[]> = {}
  dates.forEach((date) => (result[date] = []))
  for (const lesson of lessons) {
    const start = lesson.startTime
    const end = Math.max(lesson.endTime, start)
    const lastDate = formatBizTime(end > start ? end - 1 : start, DATE_FORMAT)
    let date = formatBizTime(start, DATE_FORMAT)
    for (let i = 0; date <= lastDate && i < MAX_SPAN_DAYS; i++, date = addDays(date, 1)) {
      const bucket = result[date]
      if (!bucket) continue
      const dayStart = dayStartMs(date)
      const dayEnd = dayStartMs(addDays(date, 1))
      bucket.push({
        key: `${idKey(lesson.id)}-${date}`,
        lesson,
        date,
        startMin: (Math.max(start, dayStart) - dayStart) / 60000,
        endMin: (Math.min(end, dayEnd) - dayStart) / 60000,
        fromPrevDay: start < dayStart,
        toNextDay: end > dayEnd,
        lane: 0,
        lanes: 1
      })
    }
  }
  Object.values(result).forEach(assignLanes)
  return result
}

const layoutEnd = (segment: LessonSegment) =>
  Math.max(segment.endMin, segment.startMin + MIN_LAYOUT_MINUTES)

/** 同一天内时间重叠的课次并排展示；首尾相接不算重叠 */
const assignLanes = (segments: LessonSegment[]) => {
  segments.sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  let cluster: LessonSegment[] = []
  let laneEnds: number[] = []
  let clusterEnd = -1
  const flush = () => {
    cluster.forEach((segment) => (segment.lanes = laneEnds.length))
    cluster = []
    laneEnds = []
    clusterEnd = -1
  }
  for (const segment of segments) {
    if (cluster.length && segment.startMin >= clusterEnd) flush()
    let lane = laneEnds.findIndex((end) => end <= segment.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(layoutEnd(segment))
    } else {
      laneEnds[lane] = layoutEnd(segment)
    }
    segment.lane = lane
    cluster.push(segment)
    clusterEnd = Math.max(clusterEnd, layoutEnd(segment))
  }
  flush()
}

/** 时间轴范围：默认 8-18 时，并按实际课次扩展到凌晨或深夜，不预设节次 */
export const hourRange = (segments: LessonSegment[]) => {
  let start = 8
  let end = 18
  for (const segment of segments) {
    start = Math.min(start, Math.floor(segment.startMin / 60))
    end = Math.max(end, Math.ceil(layoutEnd(segment) / 60))
  }
  return { start: Math.max(0, start), end: Math.min(24, end) }
}

/** 卡片配色：使用后端按课程生成的稳定颜色 */
export const lessonColorStyle = (lesson: LessonVO) => {
  const color = /^#[0-9a-fA-F]{6}$/.test(lesson.color || '') ? lesson.color : '#909399'
  return { borderLeftColor: color, backgroundColor: `${color}26` }
}

/** 卡片悬停的完整说明 */
export const lessonTooltip = (lesson: LessonVO) => {
  return [
    `${lesson.courseName}${lesson.status === 1 ? '（已停课）' : ''}`,
    `时间：${formatBizTime(lesson.startTime, 'YYYY-MM-DD HH:mm')} ~ ${formatBizTime(lesson.endTime, 'YYYY-MM-DD HH:mm')}`,
    `教师：${lesson.teacherName || '-'}`,
    `教室：${lesson.classroomName || '-'}`,
    `班级：${(lesson.classNames || []).join('、') || '-'}`
  ].join('\n')
}
