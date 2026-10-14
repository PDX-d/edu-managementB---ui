import request from '@/config/axios'
import type { TimetableId } from '../types'

/** 课次（startTime、endTime 为毫秒时间戳） */
export interface LessonVO {
  id: TimetableId
  semesterId: TimetableId
  courseId: TimetableId
  courseName: string
  teacherId: TimetableId
  teacherName: string
  classroomId: TimetableId
  classroomName: string
  classIds: TimetableId[]
  classNames: string[]
  startTime: number
  endTime: number
  status: number // 0 正常；1 停课
  version: TimetableId
  color: string
}

/** 单次课次新增/修改；新增不得提交 id、version，修改必须提交最新详情中的 id、version */
export interface LessonSaveReqVO {
  id?: TimetableId
  version?: TimetableId
  semesterId: TimetableId
  courseId: TimetableId
  teacherId: TimetableId
  classroomId: TimetableId
  classIds: TimetableId[]
  startTime: number
  endTime: number
}

/** 批量排课：日期为 YYYY-MM-DD，每日时间为 HH:mm:ss，weekdays 星期一为 1、星期日为 7 */
export interface LessonBatchReqVO {
  semesterId: TimetableId
  courseId: TimetableId
  teacherId: TimetableId
  classroomId: TimetableId
  classIds: TimetableId[]
  startDate: string
  endDate: string
  weekdays: number[]
  startTime: string
  endTime: string
}

/** 查询维度：本人相关、班级、教室 */
export type LessonDimension = 'SELF' | 'CLASS' | 'CLASSROOM'

/** 课次分页、日历、导出共用查询条件 */
export interface LessonQueryReqVO extends PageParam {
  semesterId?: TimetableId // 省略时后端使用当前学期
  dimension: LessonDimension
  targetId?: TimetableId // CLASS/CLASSROOM 必填；SELF 不得提供
  startDate?: string
  endDate?: string
  status?: number
}

/** 导出查询条件 */
export interface LessonExportReqVO extends LessonQueryReqVO {
  format: 'png' | 'pdf'
}

/** 冲突类型 */
export type ConflictType = 'TEACHER' | 'CLASSROOM' | 'CLASS'

/** 冲突预检结果；权限范围外的冲突不返回相关 ID */
export interface ConflictVO {
  type: ConflictType
  startTime: number
  endTime: number
  lessonId?: TimetableId
  teacherId?: TimetableId
  classroomId?: TimetableId
  classId?: TimetableId
}

// 查询课次分页
export const getLessonPage = (params: LessonQueryReqVO) => {
  return request.get<PageResult<LessonVO[]>>({ url: '/timetable/lesson/page', params })
}

// 查询明确日期范围内的课表数据
export const getLessonCalendar = (params: LessonQueryReqVO) => {
  return request.get<LessonVO[]>({ url: '/timetable/lesson/calendar', params })
}

// 查询课次详情
export const getLesson = (id: TimetableId) => {
  return request.get<LessonVO>({ url: '/timetable/lesson/get', params: { id } })
}

// 新增课次
export const createLesson = (data: LessonSaveReqVO) => {
  return request.post<TimetableId>({ url: '/timetable/lesson/create', data })
}

// 批量排课（后端整批校验、整批写入）
export const batchCreateLesson = (data: LessonBatchReqVO) => {
  return request.post<TimetableId[]>({ url: '/timetable/lesson/batch-create', data })
}

// 修改课次（按版本更新）
export const updateLesson = (data: LessonSaveReqVO) => {
  return request.put<boolean>({ url: '/timetable/lesson/update', data })
}

// 删除课次
export const deleteLesson = (id: TimetableId) => {
  return request.delete<boolean>({ url: '/timetable/lesson/delete', params: { id } })
}

// 冲突预检（仅作提示，保存时后端会再次检查）
export const checkLessonConflict = (data: LessonSaveReqVO) => {
  return request.post<ConflictVO[]>({ url: '/timetable/lesson/check-conflict', data })
}

// 导出 PNG / PDF 课表
export const exportLesson = (params: LessonExportReqVO) => {
  return request.download<Blob>({ url: '/timetable/lesson/export', params })
}
