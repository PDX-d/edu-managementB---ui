import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

const fields = ['startTime', 'endTime', 'signTime', 'serverTime', 'checkInOpenTime'] as const
type TimeField = (typeof fields)[number]
export type Serialized<T> = { [K in keyof T]: K extends TimeField ? number | null : T[K] }
export const readTimes = <T>(data: Serialized<T>): T =>
  Object.fromEntries(
    Object.entries(data as object).map(([field, value]) => [
      field,
      fields.includes(field as TimeField) && value != null
        ? dayjs(value as number)
            .tz('Asia/Shanghai')
            .format('YYYY-MM-DD HH:mm:ss')
        : value
    ])
  ) as T
export const readPage = <T>(data: PageResult<Serialized<T>[]>): PageResult<T[]> => ({
  ...data,
  list: data.list.map((row) => readTimes<T>(row))
})
export const writeTime = (value: string) => dayjs.tz(value, 'Asia/Shanghai').valueOf()
