import request from '@/config/axios'

// 教师 VO
export interface TeacherVO {
  id?: number // 教师编号
  jobNo?: string // 工号
  name?: string // 姓名
  gender?: number // 性别
  mobile?: string // 手机号
  title?: string // 职称
  education?: string // 学历
  deptId?: number // 所属院系编号
  deptName?: string // 所属院系名称
  status?: number // 状态
  remark?: string // 备注
  createTime?: Date // 创建时间
}

// 教师 API
export const TeacherApi = {
  // 查询教师分页
  getTeacherPage: async (params: any) => {
    return await request.get({ url: `/edu/teacher/page`, params })
  },

  // 查询教师详情
  getTeacher: async (id: number) => {
    return await request.get({ url: `/edu/teacher/get?id=` + id })
  },

  // 新增教师
  createTeacher: async (data: TeacherVO) => {
    return await request.post({ url: `/edu/teacher/create`, data })
  },

  // 修改教师
  updateTeacher: async (data: TeacherVO) => {
    return await request.put({ url: `/edu/teacher/update`, data })
  },

  // 删除教师
  deleteTeacher: async (id: number) => {
    return await request.delete({ url: `/edu/teacher/delete?id=` + id })
  }
}
