import request from '@/config/axios'

// 变更日志 VO（档案变更历史）
export interface ChangeLogVO {
  id?: number // 编号
  bizModule?: string // 业务模块（如：学生管理）
  bizId?: number // 业务主键（如：学生编号）
  bizNo?: string // 业务编号（如：学号）
  bizName?: string // 业务名称（如：学生姓名）
  action?: number // 操作类型：见字典 edu_change_log_action
  fieldName?: string // 变更字段名（英文）
  fieldLabel?: string // 变更字段中文名
  beforeValue?: string // 变更前值（文字）
  afterValue?: string // 变更后值（文字）
  operatorId?: number // 操作人编号
  operatorName?: string // 操作人姓名
  remark?: string // 备注 / 摘要
  createTime?: Date // 操作时间
}

// 变更日志 API
export const ChangeLogApi = {
  // 查询变更日志分页
  getChangeLogPage: async (params: any) => {
    return await request.get({ url: `/edu/change-log/page`, params })
  },

  // 导出变更日志 Excel
  exportChangeLog: async (params: any) => {
    return await request.download({ url: `/edu/change-log/export-excel`, params })
  }
}
