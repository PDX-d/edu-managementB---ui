/**
 * 后端 Long 类型 ID / 版本号：超出 JS 安全整数范围时后端会以字符串返回，
 * 因此统一按 number | string 处理，比较、去重前先规范化为字符串，不做无条件 Number() 转换。
 */
export type TimetableId = number | string

/** 日期区间，格式均为 YYYY-MM-DD */
export interface TimetableDateRange {
  startDate: string
  endDate: string
}
