<template>
  <el-dropdown v-if="can('score:export')" trigger="click" :disabled="loading" @command="download">
    <el-button plain type="success" :loading="loading"
      ><Icon icon="ep:download" class="mr-5px" />导出成绩</el-button
    >
    <template #dropdown
      ><el-dropdown-menu
        ><el-dropdown-item command="xlsx">Excel 文件</el-dropdown-item
        ><el-dropdown-item command="pdf">PDF 文件</el-dropdown-item></el-dropdown-menu
      ></template
    >
  </el-dropdown>
</template>
<script setup lang="ts">
import { exportScores } from '@/api/exam'
import type { ExamQuery } from '@/api/exam/types'
import { can, saveExportFile } from '../useExam'
import { ExportFileError } from '@/views/timetable/utils'

const props = defineProps<{ query: ExamQuery; disabled?: boolean }>()
const loading = ref(false)
const message = useMessage()
const download = async (format: 'xlsx' | 'pdf') => {
  if (loading.value || !can('score:export')) return
  if (props.disabled) return message.warning('请等待加载完成，并先保存或放弃未提交的成绩')
  const q = { ...props.query }
  if (!q.semesterId || (!q.sessionId && !q.courseId && !q.classId))
    return message.warning('导出请选择学期，并限定考试、课程或班级')
  if (q.studentNo?.trim() || q.studentName?.trim()) {
    try {
      await message.confirm('导出接口按考试、课程、班级范围导出，不按学号和姓名过滤，确认继续？')
    } catch {
      return
    }
  }
  delete q.studentNo
  delete q.studentName
  loading.value = true
  try {
    const blob = await exportScores(q, format)
    const mime =
      format === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    await saveExportFile(blob, `考试成绩.${format}`, mime)
  } catch (error) {
    if (error instanceof ExportFileError) message.error(error.message)
  } finally {
    loading.value = false
  }
}
</script>
