<template>
  <el-dropdown
    trigger="click"
    :disabled="exportLoading"
    @command="handleExport"
    v-hasPermi="['timetable:lesson:export']"
  >
    <el-button type="success" plain :loading="exportLoading">
      <Icon icon="ep:download" class="mr-5px" /> 导出
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="png">导出图片（PNG，最多 7 天）</el-dropdown-item>
        <el-dropdown-item command="pdf">导出 PDF</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
<script lang="ts" setup>
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import { diffDays, ExportFileError, saveExportFile } from '../utils'

defineOptions({ name: 'TimetableLessonExport' })

// PNG 后端限制：起止日期相差小于 7 天
const PNG_MAX_DAYS = 7

const props = defineProps<{
  baseQuery: LessonApi.LessonQueryReqVO | null // 与页面查询一致的已生效筛选条件（不含日期）
  range: TimetableDateRange | null // 与页面当前展示一致的明确日期区间
}>()

const message = useMessage()
const exportLoading = ref(false)

const handleExport = async (format: 'png' | 'pdf') => {
  if (!props.baseQuery) {
    message.warning('请先完善查询条件并搜索')
    return
  }
  const range = props.range
  if (!range) {
    message.warning('导出需要明确的日期范围：请在“日期范围”中选择，或切换到日/周/月视图')
    return
  }
  const days = diffDays(range.startDate, range.endDate) + 1
  if (format === 'png' && days > PNG_MAX_DAYS) {
    message.warning(
      `PNG 最多导出 ${PNG_MAX_DAYS} 天（当前 ${days} 天），请缩小日期范围或改用 PDF 导出`
    )
    return
  }
  try {
    await message.exportConfirm(
      `确认导出 ${range.startDate} ~ ${range.endDate} 的课表为 ${format.toUpperCase()} 吗？`
    )
  } catch {
    return
  }
  exportLoading.value = true
  try {
    const data = await LessonApi.exportLesson({ ...props.baseQuery, ...range, format })
    await saveExportFile(
      data,
      `课程表_${range.startDate}_${range.endDate}.${format}`,
      format === 'png' ? 'image/png' : 'application/pdf'
    )
  } catch (e) {
    // 请求封装已提示接口错误；这里只提示返回内容不是预期文件的情况
    if (e instanceof ExportFileError) {
      message.error(e.message)
    }
  } finally {
    exportLoading.value = false
  }
}
</script>
