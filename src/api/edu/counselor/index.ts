import request from '@/config/axios'

// 辅导员 VO
export interface CounselorVO {
  id?: number // 辅导员编号
  jobNo?: string // 工号
  name?: string // 姓名
  gender?: number // 性别
  mobile?: string // 手机号
  title?: string // 职称
  deptId?: number // 所属院系编号
  deptName?: string // 所属院系名称
  classNames?: string[] // 所带班级名称列表
  status?: number // 状态
  remark?: string // 备注
  createTime?: Date // 创建时间
}

// 辅导员 API
export const CounselorApi = {
  // 查询辅导员分页
  getCounselorPage: async (params: any) => {
    return await request.get({ url: `/edu/counselor/page`, params })
  },

  // 查询辅导员详情
  getCounselor: async (id: number) => {
    return await request.get({ url: `/edu/counselor/get?id=` + id })
  },

  // 新增辅导员
  createCounselor: async (data: CounselorVO) => {
    return await request.post({ url: `/edu/counselor/create`, data })
  },

  // 修改辅导员
  updateCounselor: async (data: CounselorVO) => {
    return await request.put({ url: `/edu/counselor/update`, data })
  },

  // 删除辅导员
  deleteCounselor: async (id: number) => {
    return await request.delete({ url: `/edu/counselor/delete?id=` + id })
  }
}
