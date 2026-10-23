export type ExamId = number | string
export interface Option {
  id: ExamId
  name: string
}
export interface Semester extends Option {
  startDate: string
  endDate: string
  archived: boolean
}
export interface References {
  mock: boolean
  currentSemesterId: ExamId | null
  semesters: Semester[]
  courses: (Option & { classIds: ExamId[] })[]
  classes: Option[]
}
export interface ExamQuery extends PageParam {
  semesterId?: ExamId
  sessionId?: ExamId
  courseId?: ExamId
  classId?: ExamId
  startDate?: string
  endDate?: string
  name?: string
  studentNo?: string
  studentName?: string
}
export interface Venue {
  id: ExamId
  version: number
  name: string
  address: string
  capacity: number
  latitude: number
  longitude: number
  radiusMeters: number
  status: number
}
export type VenueSave = Omit<Venue, 'id' | 'version'> & {
  id?: ExamId
  version?: number
}
export interface ScoreItem {
  id?: ExamId
  name: string
  weight: number
  sort: number
}
export interface SessionSave {
  id?: ExamId
  sessionVersion?: number
  name: string
  semesterId?: ExamId
  courseId?: ExamId
  classIds: ExamId[]
  venueId?: ExamId
  startTime: string
  endTime: string
  scoreItems?: ScoreItem[]
  refreshParticipants?: boolean
}
export interface Session extends SessionSave {
  id: ExamId
  semesterId: ExamId
  courseId: ExamId
  venueId: ExamId
  sessionVersion: number
  semesterName: string
  courseName: string
  classNames: string[]
  venueName: string
  venueAddress: string
  venueCapacity: number
  radiusMeters: number
  archived: boolean
  participantsLocked: boolean
  scoreConfigLocked: boolean
  scoreItems: ScoreItem[]
}
export interface Participant {
  id: ExamId
  sessionId: ExamId
  studentId: ExamId
  studentNo: string
  studentName: string
  classId: ExamId
  className: string
  signTime: string | null
}
export interface ScoreRow extends Participant {
  sessionName: string
  courseId: ExamId
  courseName: string
  startTime: string
  endTime: string
  sessionVersion: number
  rowVersion: number
  scores: Record<string, number | null>
  finalScore: number | null
}
export interface ScoreSave {
  sessionId: ExamId
  sessionVersion: number
  rows: {
    participantId: ExamId
    rowVersion: number
    scores: Record<string, number>
  }[]
}
export interface ImportResult {
  successCount: number
  errors: { row: number; message: string }[]
}
export interface Statistics {
  participantCount: number
  gradedCount: number
  ungradedCount: number
  passCount: number
  maxScore: number | null
  minScore: number | null
  averageScore: number | null
  passRate: number | null
  bands: { name: string; count: number }[]
}
export interface MyExam {
  id: ExamId
  name: string
  courseName: string
  venueName: string
  venueAddress: string
  startTime: string
  endTime: string
  signTime: string | null
  checkInOpenTime: string
  serverTime: string
  archived: boolean
}
export interface CheckIn {
  sessionId: ExamId
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: string
}
