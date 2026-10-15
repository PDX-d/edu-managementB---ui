import request from '@/config/axios'
import { getAccessToken, getCurrentUserId, getTenantId, getVisitTenantId } from '@/utils/auth'
import { getClassroomSimpleList } from '../classroom'
import type { TimetableDateRange, TimetableId } from '../types'

/**
 * 课程表公共数据适配层
 *
 * 学期、课程、教师、班级及本人业务身份统一来自后端 /timetable/reference/options，
 * 后端已按本人身份过滤，且与排课校验同源；前端不维护其他静态名单，不自行扩大范围。
 */

/** 本人业务身份：仅用于界面判断，不是权限授权依据，最终以后端校验为准 */
export interface ReferenceActor {
  type: 'ADMIN' | 'COUNSELOR' | 'TEACHER' | 'STUDENT'
  teacherId?: TimetableId | null
  studentId?: TimetableId | null
  classIds?: TimetableId[] | null
}

export interface SemesterOption {
  id: TimetableId
  name: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  archived: boolean
}

export interface CourseOption {
  id: TimetableId
  name: string
  teacherIds: TimetableId[]
  classIds: TimetableId[]
}

export interface NamedOption {
  id: TimetableId
  name: string
}

export interface ReferenceOptions {
  mock: boolean // 是否为本地模拟公共数据
  currentSemesterId: TimetableId
  actor: ReferenceActor
  semesters: SemesterOption[]
  courses: CourseOption[]
  teachers: NamedOption[]
  classes: NamedOption[]
}

// 按账号、租户和登录凭证区分缓存，切换后自动失效，不跨账号复用身份和名单
let cache: { key: string; promise: Promise<ReferenceOptions> } | null = null
const cacheKey = () =>
  [getTenantId(), getVisitTenantId(), getCurrentUserId(), getAccessToken()].join('|')

/** 获取公共选项（需要 timetable:lesson:query）；同一账号下复用请求结果，force 时重新加载 */
export const getReferenceOptions = (force = false): Promise<ReferenceOptions> => {
  const key = cacheKey()
  if (force || !cache || cache.key !== key) {
    const promise = request.get<ReferenceOptions>({ url: '/timetable/reference/options' })
    cache = { key, promise }
    // 失败的请求不缓存，下次重新加载
    promise.catch(() => {
      if (cache?.promise === promise) cache = null
    })
  }
  return cache.promise
}

/** 在选项中查找学期；未指定时取当前学期 */
export const findSemester = (
  options: ReferenceOptions,
  semesterId?: TimetableId | null
): SemesterOption | undefined => {
  const id = String(semesterId ?? options.currentSemesterId)
  return options.semesters.find((item) => String(item.id) === id)
}

/** 获取学期起止日期；学期不在公共选项中时返回 null */
export const getSemesterRange = async (
  semesterId?: TimetableId
): Promise<TimetableDateRange | null> => {
  const semester = findSemester(await getReferenceOptions(), semesterId)
  return semester ? { startDate: semester.startDate, endDate: semester.endDate } : null
}

/** 排课可选的启用教室（真实接口，需要 timetable:classroom:query 权限，学生不调用） */
export const getClassroomOptions = () => getClassroomSimpleList()
