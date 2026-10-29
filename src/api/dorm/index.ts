import request from '@/config/axios'
import { scoped } from './context'
import type * as T from './types'

const url = (path: string) => `/dorm/${path}`
const get = <R>(path: string, params?: object) =>
  scoped(() => request.get<R>({ url: url(path), params }))
const post = <R>(path: string, data: object) =>
  scoped(() => request.post<R>({ url: url(path), data }))
const put = <R>(path: string, data: object) =>
  scoped(() => request.put<R>({ url: url(path), data }))
const remove = (path: string, params: T.Version) =>
  scoped(() => request.delete<boolean>({ url: url(path), params }))
const page = <R>(path: string, params: T.Query) => get<PageResult<R[]>>(path, params)

export const references = () => get<T.References>('reference/options')
export const students = (q: T.Query) => page<T.Student>('reference/students', q)
export const buildings = (q: T.Query) => page<T.Building>('building/page', q)
export const building = (id: T.Id) => get<T.Building>('building/get', { id })
export const saveBuilding = (data: T.BuildingSave) =>
  data.id ? put<boolean>('building/update', data) : post<T.Id>('building/create', data)
export const deleteBuilding = (data: T.Version) => remove('building/delete', data)
export const rooms = (q: T.Query) => page<T.Room>('room/page', q)
export const room = (id: T.Id) => get<T.Room>('room/get', { id })
export const saveRoom = (data: T.RoomSave) =>
  data.id ? put<boolean>('room/update', data) : post<T.Id>('room/create', data)
export const deleteRoom = (data: T.Version) => remove('room/delete', data)
export const beds = (roomId: T.Id) => get<T.Bed[]>('room/beds', { roomId })
export const updateBed = (data: T.Version & { status: number }) =>
  put<boolean>('room/bed/update', data)
export const bedOptions = (q: T.Query) => page<T.Bed>('room/bed-options', q)
export const stays = (q: T.Query) => page<T.Stay>('stay/page', q)
export const myStays = (q: T.Query) => page<T.Stay>('stay/my', q)
export const stay = (id: T.Id) => get<T.Stay>('stay/get', { id })
export const assign = (data: { studentId: T.Id; bedId: T.Id }) => post<T.Id>('stay/assign', data)
export const autoAssign = (data: { studentIds: T.Id[]; buildingIds: T.Id[] }) =>
  post<T.Id[]>('stay/auto-assign', data)
export const cancelStay = (data: T.Version) => post<boolean>('stay/cancel', data)
export const checkIn = (data: T.Version & { depositAmount: T.Amount }) =>
  post<boolean>('stay/check-in', data)
export const checkOut = (
  data: T.Version & { inspection: string; deductionAmount: T.Amount; deductionReason?: string }
) => post<boolean>('stay/check-out', data)
export const refund = (data: T.Version) => post<boolean>('stay/confirm-refund', data)
export const changes = (q: T.Query) => page<T.Change>('change-request/page', q)
export const change = (id: T.Id) => get<T.Change>('change-request/get', { id })
export const createChange = (data: T.MoveSave) => post<T.Id>('change-request/create', data)
export const directAdjust = (data: T.MoveSave) => post<T.Id>('change-request/direct-adjust', data)
export const cancelChange = (data: T.Version) => post<boolean>('change-request/cancel', data)
export const reviewChange = (approved: boolean, data: T.Version & { reason: string }) =>
  post<boolean>(`change-request/${approved ? 'approve' : 'reject'}`, data)
export const roster = (q: T.Query) => page<T.Roster>('night-check/roster', q)
export const nights = (q: T.Query) => page<T.Night>('night-check/page', q)
export const night = (id: T.Id) => get<T.Night>('night-check/get', { id })
export const saveNights = (items: T.NightSave[], rosterDate?: string) =>
  post<boolean>('night-check/batch-save', { items, rosterDate })
export const hygienePage = (q: T.Query) => page<T.Hygiene>('hygiene/page', q)
export const hygiene = (id: T.Id) => get<T.Hygiene>('hygiene/get', { id })
export const saveHygiene = (data: T.HygieneSave) =>
  data.id ? put<boolean>('hygiene/update', data) : post<T.Id>('hygiene/create', data)
export const ranking = (period: string, date: string) =>
  get<T.Ranking[]>('hygiene/ranking', { period, date })
export const violations = (q: T.Query) => page<T.Violation>('violation/page', q)
export const violation = (id: T.Id) => get<T.Violation>('violation/get', { id })
export const saveViolation = (data: T.ViolationSave) =>
  data.id ? put<boolean>('violation/update', data) : post<T.Id>('violation/create', data)
export const linkDiscipline = (data: T.Version & { disciplineId: T.Id }) =>
  put<boolean>('violation/link-discipline', data)
export const travelContext = () => get<T.TravelContext>('travel/context')
export const trips = (q: T.Query) => page<T.Trip>('travel/page', q)
export const trip = (id: T.Id) => get<T.Trip>('travel/get', { id })
export const summary = (q: T.Query) => get<T.Summary[]>('travel/summary', q)
export const depart = (data: T.Position, photo: File) => {
  const body = new FormData()
  body.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
  body.append('photo', photo)
  return scoped(() =>
    request.post<T.Trip>({
      url: url('travel/depart'),
      data: body,
      headersType: 'multipart/form-data'
    })
  )
}
export const returnTrip = (data: T.Position & { tripId: T.Id }) =>
  post<T.Trip>('travel/return', data)
export const reviewTrip = (data: T.Version & { status: string; reason: string }) =>
  post<boolean>('travel/review', data)
export const photo = (id: T.Id) =>
  scoped(() => request.download<Blob>({ url: url('photo/get'), params: { id } }))
