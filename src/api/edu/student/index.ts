import request from '@/config/axios'

// 学生标签 VO
export interface StudentTagVO {
  id?: number // 标签编号
  name?: string // 标签名称
  color?: string // 标签颜色
  sort?: number // 显示顺序
  status?: number // 状态：0=开启 / 1=关闭
  remark?: string // 备注
  createTime?: Date // 创建时间
}

// 学生 VO
export interface StudentVO {
  id?: number // 学生编号
  studentNo?: string // 学号
  name?: string // 姓名
  gender?: number // 性别
  idCard?: string // 身份证号
  birthDate?: string // 出生日期
  nation?: string // 民族
  politicalStatus?: number // 政治面貌
  nativePlace?: string // 籍贯
  gradeId?: number // 年级编号
  gradeName?: string // 年级名称
  classId?: number // 班级编号
  className?: string // 班级名称
  majorId?: number // 专业编号（数据源为专业表 dict_major）
  majorName?: string // 专业名称
  deptId?: number // 所属院系编号
  deptName?: string // 所属院系名称
  educationSystem?: number // 学制
  enrollmentYear?: number // 入学年份
  admissionDate?: string // 入学日期
  graduateDate?: string // 毕业日期
  dormitory?: string // 宿舍
  mobile?: string // 手机号
  email?: string // 邮箱
  status?: number // 状态：0=在读 / 1=休学 / 2=退学 / 3=毕业 / 4=复学
  photoUrl?: string // 证件照 URL
  idCardFrontUrl?: string // 身份证正面 URL
  idCardBackUrl?: string // 身份证反面 URL
  userId?: number // 关联登录用户编号
  guardianName?: string // 监护人姓名
  guardianMobile?: string // 监护人手机号
  address?: string // 家庭地址
  emergencyContact?: string // 紧急联系人
  emergencyMobile?: string // 紧急联系人手机号
  remark?: string // 备注
  tagIds?: number[] // 标签编号列表
  tags?: StudentTagVO[] // 标签列表
  createTime?: Date // 创建时间
}

// 学生变更记录 VO
export interface StudentChangeRecordVO {
  id?: number // 变更记录编号
  studentId?: number // 学生编号
  studentName?: string // 学生姓名
  changeType?: number // 变更类型：1=学籍状态变更 / 2=调班 / 3=复学
  fromValue?: string // 原值
  toValue?: string // 新值
  reason?: string // 变更原因
  approvalStatus?: number // 审批状态：0=草稿 / 1=审批中 / 2=通过 / 3=驳回
  processInstanceId?: string // BPM 流程实例编号（未发布流程模型时为空，走轻量审批）
  approverId?: number // 审批人编号
  approveTime?: Date // 审批时间
  approveRemark?: string // 审批意见
  createTime?: Date // 创建时间
}

// 学生 API
export const StudentApi = {
  // 查询学生分页
  getStudentPage: async (params: any) => {
    return await request.get({ url: `/edu/student/page`, params })
  },

  // 查询学生详情
  getStudent: async (id: number) => {
    return await request.get({ url: `/edu/student/get?id=` + id })
  },

  // 新增学生
  createStudent: async (data: StudentVO) => {
    return await request.post({ url: `/edu/student/create`, data })
  },

  // 修改学生
  updateStudent: async (data: StudentVO) => {
    return await request.put({ url: `/edu/student/update`, data })
  },

  // 删除学生
  deleteStudent: async (id: number) => {
    return await request.delete({ url: `/edu/student/delete?id=` + id })
  },

  // 导出学生 Excel
  exportStudent: async (params: any) => {
    return await request.download({ url: `/edu/student/export-excel`, params })
  },

  // 查询年级列表
  getGradeList: async () => {
    return await request.get({ url: `/edu/student/grade-list` })
  },

  // 查询班级列表
  getClassList: async (gradeId?: number) => {
    return await request.get({ url: `/edu/student/class-list`, params: { gradeId } })
  },

  // 查询专业列表（数据源为专业表 dict_major，依赖年级联动）
  // TODO: 字典中心模块待接入
  getMajorList: async (gradeId?: number) => {
    return await request.get({ url: `/edu/student/major-list`, params: { gradeId } })
  }
}

// 学生导入 API
export const StudentImportApi = {
  // 下载学生导入模板
  importTemplate: async () => {
    return await request.download({ url: `/edu/student/get-import-template` })
  },

  // 导入学生
  importStudent: async (file: File, updateSupport: boolean) => {
    return await request.upload({
      url: `/edu/student/import?updateSupport=` + updateSupport,
      data: { file }
    })
  }
}

// 学生标签 API
export const StudentTagApi = {
  // 查询标签列表
  getTagList: async () => {
    return await request.get({ url: `/edu/student/tag/list` })
  },

  // 查询标签详情
  getTag: async (id: number) => {
    return await request.get({ url: `/edu/student/tag/get?id=` + id })
  },

  // 新增标签
  createTag: async (data: StudentTagVO) => {
    return await request.post({ url: `/edu/student/tag/create`, data })
  },

  // 修改标签
  updateTag: async (data: StudentTagVO) => {
    return await request.put({ url: `/edu/student/tag/update`, data })
  },

  // 删除标签
  deleteTag: async (id: number) => {
    return await request.delete({ url: `/edu/student/tag/delete?id=` + id })
  },

  // 拖拽排序（提交拖拽后的完整标签编号顺序，后端批量重写 sort，保证连续递增且唯一）
  reorderTag: async (tagIds: number[]) => {
    return await request.put({ url: `/edu/student/tag/reorder`, data: { tagIds } })
  }
}

// 学生变更 API
export const StudentChangeApi = {
  // 查询变更记录分页
  getChangePage: async (params: any) => {
    return await request.get({ url: `/edu/student/change/page`, params })
  },

  // 新增变更申请
  createChange: async (data: StudentChangeRecordVO) => {
    return await request.post({ url: `/edu/student/change/create`, data })
  },

  // 审批变更申请
  approveChange: async (data: StudentChangeRecordVO) => {
    return await request.put({ url: `/edu/student/change/approve`, data })
  }
}
