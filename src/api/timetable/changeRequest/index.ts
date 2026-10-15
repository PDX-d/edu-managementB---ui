import request from '@/config/axios'
import type { TimetableId } from '../types'

/** 申请类型：CHANGE 调课；CANCEL 停课 */
export type ChangeType = 'CHANGE' | 'CANCEL'

/** 调停课申请（时间字段均为毫秒时间戳） */
export interface ChangeRequestVO {
  id: TimetableId
  lessonId: TimetableId
  originalVersion: TimetableId
  originalStartTime: number
  originalEndTime: number
  originalClassroomId: TimetableId
  type: ChangeType
  targetStartTime?: number
  targetEndTime?: number
  targetClassroomId?: TimetableId
  reason: string
  applicantId: TimetableId
  status: number // 0 待审批；1 通过；2 拒绝
  reviewerId?: TimetableId
  reviewTime?: number
  reviewReason?: string
  createTime: number
}

/** 申请提交；停课申请不得提交三个目标字段 */
export interface ChangeCreateReqVO {
  lessonId: TimetableId
  type: ChangeType
  reason: string
  targetStartTime?: number
  targetEndTime?: number
  targetClassroomId?: TimetableId
}

/** 审批（通过、拒绝均需填写审批意见） */
export interface ChangeReviewReqVO {
  id: TimetableId
  reason: string
}

/** 申请分页查询 */
export interface ChangePageReqVO extends PageParam {
  lessonId?: TimetableId
  status?: number
}

// 查询申请分页
export const getChangeRequestPage = (params: ChangePageReqVO) => {
  return request.get<PageResult<ChangeRequestVO[]>>({
    url: '/timetable/change-request/page',
    params
  })
}

// 查询申请详情
export const getChangeRequest = (id: TimetableId) => {
  return request.get<ChangeRequestVO>({ url: '/timetable/change-request/get', params: { id } })
}

// 教师提交调停课申请
export const createChangeRequest = (data: ChangeCreateReqVO) => {
  return request.post<TimetableId>({ url: '/timetable/change-request/create', data })
}

// 审批通过
export const approveChangeRequest = (data: ChangeReviewReqVO) => {
  return request.put<boolean>({ url: '/timetable/change-request/approve', data })
}

// 审批拒绝
export const rejectChangeRequest = (data: ChangeReviewReqVO) => {
  return request.put<boolean>({ url: '/timetable/change-request/reject', data })
}
