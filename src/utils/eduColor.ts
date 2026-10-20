/**
 * 学院系统通用固定 16 色色板
 *
 * 【为什么单独抽一个文件】
 * 「学生标签颜色」与「校历节点颜色」使用同一套十六固定色，要求：
 * 1. 只能从色板选择，不提供自由输入（后端也按同一套色值校验，见 TagColorEnum）；
 * 2. 两处色板必须完全一致，避免各写一份后慢慢漂移。
 * 因此这里作为唯一数据源，两处共用。
 *
 * 颜色值如需扩充，请同步修改后端 cn.iocoder.yudao.module.edu.enums.student.TagColorEnum。
 */
export interface EduColorOption {
  color: string // 颜色值（十六进制）
  name: string // 颜色名称（用于色板悬浮提示）
}

/** 固定 16 色色板 */
export const EDU_COLOR_OPTIONS: EduColorOption[] = [
  { color: '#409EFF', name: '蓝色' },
  { color: '#67C23A', name: '绿色' },
  { color: '#E6A23C', name: '橙色' },
  { color: '#F56C6C', name: '红色' },
  { color: '#909399', name: '灰色' },
  { color: '#00BCD4', name: '青色' },
  { color: '#3F51B5', name: '靛蓝' },
  { color: '#9C27B0', name: '紫色' },
  { color: '#E91E63', name: '玫红' },
  { color: '#FF9800', name: '深橙' },
  { color: '#795548', name: '棕色' },
  { color: '#607D8B', name: '蓝灰' },
  { color: '#4CAF50', name: '深绿' },
  { color: '#FFC107', name: '琥珀' },
  { color: '#673AB7', name: '深紫' },
  { color: '#009688', name: '蓝绿' }
]

/** 默认颜色（色板第 1 个） */
export const EDU_DEFAULT_COLOR = EDU_COLOR_OPTIONS[0].color
