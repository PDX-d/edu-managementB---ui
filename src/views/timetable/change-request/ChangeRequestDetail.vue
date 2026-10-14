<template>
  <Dialog v-model="dialogVisible" title="调停课申请详情" width="680px">
    <el-descriptions v-loading="loading" :column="1" border>
      <template v-if="detail">
        <el-descriptions-item label="申请类型">
          {{ CHANGE_TYPE_LABELS[detail.type] || detail.type }}
        </el-descriptions-item>
        <el-descriptions-item label="审批状态">
          <ChangeStatusTag :status="detail.status" />
        </el-descriptions-item>
        <el-descriptions-item label="原课次">
          <div>{{ formatBizRange(detail.originalStartTime, detail.originalEndTime) }}</div>
          <div>
            课次 {{ detail.lessonId }}，教室 {{ detail.originalClassroomId }}，版本
            {{ detail.originalVersion }}
          </div>
        </el-descriptions-item>
        <el-descriptions-item v-if="lesson" label="课次当前信息">
          {{ lesson.courseName }} / {{ lesson.teacherName }} / {{ lesson.classroomName }} /
          {{ (lesson.classNames || []).join('、') }} /
          {{ formatBizRange(lesson.startTime, lesson.endTime) }}
          <el-tag v-if="lesson.status === 1" type="danger" size="small">停课</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="目标安排">
          <template v-if="detail.type === 'CHANGE'">
            {{ formatBizRange(detail.targetStartTime, detail.targetEndTime) }}，教室
            {{ detail.targetClassroomId }}
          </template>
          <template v-else>停课，无目标安排</template>
        </el-descriptions-item>
        <el-descriptions-item label="申请原因">{{ detail.reason }}</el-descriptions-item>
        <el-descriptions-item label="申请人账号">{{ detail.applicantId }}</el-descriptions-item>
        <el-descriptions-item label="申请时间">
          {{ formatBizTime(detail.createTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="审批意见">
          {{ detail.reviewReason || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="审批人账号">
          {{ detail.reviewerId ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="审批时间">
          {{ formatBizTime(detail.reviewTime) || '-' }}
        </el-descriptions-item>
      </template>
    </el-descriptions>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ChangeRequestApi from '@/api/timetable/changeRequest'
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableId } from '@/api/timetable/types'
import { checkPermi } from '@/utils/permission'
import { CHANGE_TYPE_LABELS, formatBizRange, formatBizTime } from '../utils'
import ChangeStatusTag from './ChangeStatusTag.vue'

defineOptions({ name: 'TimetableChangeRequestDetail' })

const dialogVisible = ref(false)
const loading = ref(false)
const detail = ref<ChangeRequestApi.ChangeRequestVO>()
const lesson = ref<LessonApi.LessonVO>() // 课次当前信息，仅在可访问时展示

/** 打开弹窗，获取最新申请详情 */
const open = async (id: TimetableId) => {
  dialogVisible.value = true
  detail.value = undefined
  lesson.value = undefined
  loading.value = true
  try {
    detail.value = await ChangeRequestApi.getChangeRequest(id)
  } catch {
    dialogVisible.value = false
    return
  } finally {
    loading.value = false
  }
  if (checkPermi(['timetable:lesson:query'])) {
    try {
      lesson.value = await LessonApi.getLesson(detail.value.lessonId)
    } catch {}
  }
}
defineExpose({ open })
</script>
