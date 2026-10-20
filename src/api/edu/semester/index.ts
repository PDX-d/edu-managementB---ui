import request from '@/config/axios'
import { toDayString } from '@/utils/formatTime'

// 学期 VO
export interface SemesterVO {
  id?: number // 学期编号
  name?: string // 学期名称（后端按「学院名称 + 学年 + 学期」自动生成，只读）
  schoolYear?: string // 学年，如 2025-2026（后端按起止年份自动生成，只读）
  schoolYearStart?: number // 学年起始年份（表单双年份下拉用，如 2025）
  schoolYearEnd?: number // 学年结束年份（表单双年份下拉用，必须为起始年份 + 1，如 2026）
  term?: number // 学期：1=第一学期 / 2=第二学期
  startDate?: string // 开始日期
  endDate?: string // 结束日期
  isCurrent?: boolean // 是否当前学期（后端按日期自动判定，只读）
  status?: number // 状态：0=未开始 / 1=进行中 / 2=已结束（后端按日期自动推导，只读）
  archived?: boolean // 是否归档（已结束的学期保存时自动归档）
  remark?: string // 备注
  createTime?: Date // 创建时间
}

// 校历节点 VO
export interface SemesterCalendarVO {
  id?: number // 校历节点编号
  semesterId?: number // 学期编号
  name?: string // 节点名称
  type?: number // 节点类型
  startDate?: string // 开始日期
  endDate?: string // 结束日期
  weekNo?: number // 周次
  color?: string // 颜色
  remark?: string // 备注
  createTime?: Date // 创建时间
}

/** 归一化后端返回的学期日期字段（LocalDate 时间戳数组 → YYYY-MM-DD 字符串） */
const normalizeSemester = (semester?: SemesterVO) => {
  if (!semester) {
    return semester
  }
  semester.startDate = toDayString(semester.startDate)
  semester.endDate = toDayString(semester.endDate)
  return semester
}

/** 归一化后端返回的校历节点日期字段（同 LocalDate 时间戳数组问题） */
const normalizeCalendar = (node?: SemesterCalendarVO) => {
  if (!node) {
    return node
  }
  node.startDate = toDayString(node.startDate)
  node.endDate = toDayString(node.endDate)
  return node
}

// 学期 API
export const SemesterApi = {
  // 查询学期分页
  getSemesterPage: async (params: any) => {
    const data = await request.get({ url: `/edu/semester/page`, params })
    data.list?.forEach(normalizeSemester)
    return data
  },

  // 查询学期详情（学期详情必然存在，返回非空 VO）
  getSemester: async (id: number): Promise<SemesterVO> => {
    return normalizeSemester(await request.get({ url: `/edu/semester/get?id=` + id })) ?? {}
  },

  // 新增学期
  createSemester: async (data: SemesterVO) => {
    return await request.post({ url: `/edu/semester/create`, data })
  },

  // 修改学期
  updateSemester: async (data: SemesterVO) => {
    return await request.put({ url: `/edu/semester/update`, data })
  },

  // 删除学期
  deleteSemester: async (id: number) => {
    return await request.delete({ url: `/edu/semester/delete?id=` + id })
  },

  // 归档 / 取消归档学期（archived=true 归档、false 取消归档；归档后该学期只读）
  archiveSemester: async (id: number, archived: boolean) => {
    return await request.put({ url: `/edu/semester/archive`, params: { id, archived } })
  },

  // 查询当前学期
  getCurrentSemester: async () => {
    return normalizeSemester(await request.get({ url: `/edu/semester/get-current` }))
  },

  // 查询学院名称（用于学期名称只读回显）
  getCollegeName: async () => {
    return await request.get({ url: `/edu/semester/get-college-name` })
  }
}

// 校历 API
export const SemesterCalendarApi = {
  // 查询学期的校历节点列表
  getCalendarList: async (semesterId: number) => {
    const data = await request.get({
      url: `/edu/semester/calendar/list`,
      params: { semesterId }
    })
    data.forEach(normalizeCalendar)
    return data
  },

  // 新增校历节点
  createCalendar: async (data: SemesterCalendarVO) => {
    return await request.post({ url: `/edu/semester/calendar/create`, data })
  },

  // 修改校历节点
  updateCalendar: async (data: SemesterCalendarVO) => {
    return await request.put({ url: `/edu/semester/calendar/update`, data })
  },

  // 删除校历节点
  deleteCalendar: async (id: number) => {
    return await request.delete({ url: `/edu/semester/calendar/delete?id=` + id })
  }
}
