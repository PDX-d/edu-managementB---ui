import request from '@/config/axios'
import type { TimetableId } from '../types'

/** 教室 */
export interface ClassroomVO {
  id: TimetableId
  code: string
  name: string
  location: string
  capacity: number
  status: number // 0 启用；1 停用
}

/** 教室新增/修改 */
export interface ClassroomSaveReqVO {
  id?: TimetableId
  code: string
  name: string
  location: string
  capacity: number
  status: number
}

/** 教室分页查询 */
export interface ClassroomPageReqVO extends PageParam {
  name?: string
  status?: number
}

// 查询教室分页
export const getClassroomPage = (params: ClassroomPageReqVO) => {
  return request.get<PageResult<ClassroomVO[]>>({ url: '/timetable/classroom/page', params })
}

// 查询教室详情
export const getClassroom = (id: TimetableId) => {
  return request.get<ClassroomVO>({ url: '/timetable/classroom/get', params: { id } })
}

// 查询可选的启用教室（排课使用）
export const getClassroomSimpleList = () => {
  return request.get<ClassroomVO[]>({ url: '/timetable/classroom/simple-list' })
}

// 新增教室
export const createClassroom = (data: ClassroomSaveReqVO) => {
  return request.post<TimetableId>({ url: '/timetable/classroom/create', data })
}

// 修改教室（含停用）
export const updateClassroom = (data: ClassroomSaveReqVO) => {
  return request.put<boolean>({ url: '/timetable/classroom/update', data })
}

// 删除教室（已被课次或申请引用时后端会拒绝）
export const deleteClassroom = (id: TimetableId) => {
  return request.delete<boolean>({ url: '/timetable/classroom/delete', params: { id } })
}
