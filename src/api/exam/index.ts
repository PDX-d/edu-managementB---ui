import { examRequest as request, examMutation } from './sync'
import { readPage, readTimes, writeTime, type Serialized } from './time'
import type {
  CheckIn,
  ExamId,
  ExamQuery,
  ImportResult,
  MyExam,
  Participant,
  References,
  ScoreItem,
  ScoreRow,
  ScoreSave,
  Session,
  SessionSave,
  Statistics,
  Venue,
  VenueSave
} from './types'

export const getReferences = () => request.get<References>({ url: '/exam/reference/options' })
export const getVenuePage = (params: PageParam & { name?: string; status?: number }) =>
  request.get<PageResult<Venue[]>>({ url: '/exam/venue/page', params })
export const getVenues = () => request.get<Venue[]>({ url: '/exam/venue/simple-list' })
export const getVenue = (id: ExamId) =>
  request.get<Venue>({ url: '/exam/venue/get', params: { id } })
export const saveVenue = (data: VenueSave) =>
  examMutation<boolean | ExamId>(
    () =>
      data.id
        ? request.put<boolean>({ url: '/exam/venue/update', data })
        : request.post<ExamId>({ url: '/exam/venue/create', data }),
    (result) => ({
      type: 'venue',
      action: data.id ? 'updated' : 'created',
      venueId: data.id ?? (result as ExamId)
    }),
    (result) => (data.id ? result === true : /^[1-9]\d*$/.test(String(result)))
  )
export const deleteVenue = (id: ExamId, version: number) =>
  examMutation(
    () => request.delete<boolean>({ url: '/exam/venue/delete', params: { id, version } }),
    { type: 'venue', action: 'deleted', venueId: id }
  )
export const getSessionPage = async (params: ExamQuery) =>
  readPage<Session>(
    await request.get<PageResult<Serialized<Session>[]>>({ url: '/exam/session/page', params })
  )
export const getSession = async (id: ExamId) =>
  readTimes<Session>(
    await request.get<Serialized<Session>>({ url: '/exam/session/get', params: { id } })
  )
export const saveSession = (data: SessionSave) => {
  const body = { ...data, startTime: writeTime(data.startTime), endTime: writeTime(data.endTime) }
  return examMutation<boolean | ExamId>(
    () =>
      data.id
        ? request.put<boolean>({ url: '/exam/session/update', data: body })
        : request.post<ExamId>({ url: '/exam/session/create', data: body }),
    (result) => ({
      type: 'session',
      action: data.id ? 'updated' : 'created',
      sessionId: data.id ?? (result as ExamId)
    }),
    (result) => (data.id ? result === true : /^[1-9]\d*$/.test(String(result)))
  )
}
export const deleteSession = (id: ExamId, sessionVersion: number) =>
  examMutation(
    () => request.delete<boolean>({ url: '/exam/session/delete', params: { id, sessionVersion } }),
    { type: 'session', action: 'deleted', sessionId: id }
  )
export const getParticipants = async (sessionId: ExamId, classId?: ExamId) =>
  (
    await request.get<Serialized<Participant>[]>({
      url: '/exam/session/participants',
      params: { sessionId, classId }
    })
  ).map((row) => readTimes<Participant>(row))
export const getScorePage = async (params: ExamQuery) =>
  readPage<ScoreRow>(
    await request.get<PageResult<Serialized<ScoreRow>[]>>({ url: '/exam/score/page', params })
  )
export const saveScores = (data: ScoreSave) =>
  examMutation(() => request.put<boolean>({ url: '/exam/score/batch-save', data }), {
    type: 'score',
    action: 'updated',
    sessionId: data.sessionId
  })
export const saveScoreConfig = (
  sessionId: ExamId,
  sessionVersion: number,
  scoreItems: ScoreItem[]
) =>
  examMutation(
    () =>
      request.put<boolean>({
        url: '/exam/score/config',
        data: { sessionId, sessionVersion, scoreItems }
      }),
    { type: 'config', action: 'updated', sessionId }
  )
export const getImportTemplate = (sessionId: ExamId) =>
  request.download<Blob>({ url: '/exam/score/import-template', params: { sessionId } })
export const importScores = (sessionId: ExamId, sessionVersion: number, file: File) => {
  const data = new FormData()
  data.append('sessionId', String(sessionId))
  data.append('sessionVersion', String(sessionVersion))
  data.append('file', file)
  return examMutation(
    () =>
      request.post<ImportResult>({
        url: '/exam/score/import',
        data,
        headersType: 'multipart/form-data'
      }),
    { type: 'score', action: 'updated', sessionId },
    (result) => result.successCount > 0 && result.errors.length === 0
  )
}
export const exportScores = (params: ExamQuery, format: 'xlsx' | 'pdf') =>
  request.download<Blob>({ url: '/exam/score/export', params: { ...params, format } })
export const getStatistics = (params: ExamQuery) =>
  request.get<Statistics>({ url: '/exam/statistics/get', params })
export const getMyExamPage = async (params: ExamQuery) =>
  readPage<MyExam>(
    await request.get<PageResult<Serialized<MyExam>[]>>({ url: '/exam/my-exam/page', params })
  )
export const getMyExam = async (id: ExamId) =>
  readTimes<MyExam>(
    await request.get<Serialized<MyExam>>({ url: '/exam/my-exam/get', params: { id } })
  )
type CheckInResult = { checkedIn: boolean; signTime: string; serverTime: string }
export const checkIn = async (data: CheckIn) =>
  readTimes<CheckInResult>(
    await examMutation(
      () =>
        request.post<Serialized<CheckInResult>>({
          url: '/exam/check-in/create',
          data: { ...data, capturedAt: writeTime(data.capturedAt) }
        }),
      { type: 'check-in', action: 'updated', sessionId: data.sessionId },
      (result) => result.checkedIn
    )
  )
