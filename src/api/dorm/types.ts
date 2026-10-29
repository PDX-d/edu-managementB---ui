export type Id = number | string
export type Amount = number | string
export interface Version {
  id: Id
  rowVersion: Id
}
export interface RecordInfo extends Version {
  createTime?: number
}
export interface Query {
  pageNo: number
  pageSize: number
  keyword?: string
  studentId?: Id
  classId?: Id
  buildingId?: Id
  roomId?: Id
  stayId?: Id
  status?: string
  startDate?: string
  endDate?: string
}
export interface References {
  mock: boolean
  actorType: 'ADMIN' | 'COUNSELOR' | 'STUDENT'
  studentId?: Id
  classes: Record<string, string>
}
export interface Student {
  id: Id
  studentNo: string
  name: string
  classId: Id
  className: string
  gender: string
  enrolled: boolean
}
export interface Building extends RecordInfo {
  name: string
  floors: number
  gender: string
  status: number
}
export interface Room extends RecordInfo {
  buildingId: Id
  buildingName: string
  roomNo: string
  floorNumber: number
  gender: string
  status: number
  bedCount: number
  allocatedCount: number
  occupiedCount: number
}
export interface Bed extends RecordInfo {
  buildingId: Id
  buildingName: string
  roomId: Id
  roomNo: string
  bedNo: string
  bedLabel: string
  status: number
}
export interface Resident {
  studentId: Id
  studentNo: string
  studentName: string
  classId: Id
  className: string
}
export interface Stay extends RecordInfo, Resident {
  gender: string
  bedId: Id
  roomId: Id
  buildingId: Id
  bedLabel: string
  status: 'RESERVED' | 'OCCUPIED' | 'CHECKED_OUT' | 'CANCELLED'
  checkInTime?: number
  checkOutTime?: number
  depositAmount?: Amount
  deductionAmount?: Amount
  refundAmount?: Amount
  inspection?: string
  deductionReason?: string
  refundStatus: 'NOT_REQUIRED' | 'PENDING' | 'REFUNDED'
  refundTime?: number
  refundAccountId?: Id
}
export interface Change extends RecordInfo, Resident {
  stayId: Id
  applicantId: Id
  sourceBedId: Id
  sourceBedLabel: string
  targetBedId: Id
  targetBedLabel: string
  stayVersion: Id
  reason: string
  source: 'STUDENT' | 'STAFF'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
  reviewerId?: Id
  reviewedAt?: number
  reviewReason?: string
}
export interface Night extends RecordInfo, Resident {
  stayId: Id
  roomId: Id
  bedLabel: string
  checkDate: string
  status: 'PRESENT' | 'ABSENT'
  reason?: string
}
export interface Roster {
  checkDate: string
  stay: Stay
  check?: Night
}
export interface Hygiene extends RecordInfo {
  roomId: Id
  roomLabel: string
  checkDate: string
  score: number
  remark?: string
}
export interface Ranking {
  roomId: Id
  roomLabel: string
  averageScore: Amount
  checkedDays: number
  rank: number
}
export interface Violation extends RecordInfo, Resident {
  stayId: Id
  roomId: Id
  bedLabel: string
  occurredAt: number
  type: string
  description: string
  disciplineId?: Id
}
export interface Trip extends RecordInfo, Resident {
  departRequestId: string
  returnRequestId?: string
  departTime: number
  departLatitude: number
  departLongitude: number
  departAccuracy: number
  departCapturedAt: number
  returnTime?: number
  returnLatitude?: number
  returnLongitude?: number
  returnAccuracy?: number
  returnCapturedAt?: number
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewerId?: Id
  reviewedAt?: number
  reviewReason?: string
  photoId: Id
}
export interface Summary {
  classId: Id
  className: string
  totalDepartures: number
  returned: number
  outside: number
}
export interface TravelContext {
  serverTime: number
  activeTrip?: Trip
}
export interface Position {
  requestId: string
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: number
}
export interface BuildingSave {
  id?: Id
  rowVersion?: Id
  name: string
  floors: number
  gender: string
  status: number
}
export interface RoomSave {
  id?: Id
  rowVersion?: Id
  buildingId?: Id
  roomNo: string
  floorNumber: number
  status: number
  bedCount?: number
}
export interface MoveSave {
  stayId: Id
  stayVersion: Id
  targetBedId: Id
  reason: string
}
export interface NightSave {
  id?: Id
  rowVersion?: Id
  stayId: Id
  checkDate: string
  status: string
  reason?: string
}
export interface HygieneSave {
  id?: Id
  rowVersion?: Id
  roomId?: Id
  checkDate: string
  score: number
  remark: string
}
export interface ViolationSave {
  id?: Id
  rowVersion?: Id
  stayId?: Id
  occurredAt: number
  type: string
  description: string
  disciplineId?: Id
}
