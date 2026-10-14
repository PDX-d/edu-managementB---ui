<template>
  <Dialog v-model="dialogVisible" title="课次详情" width="640px">
    <el-descriptions v-loading="loading" :column="1" border>
      <template v-if="detail">
        <el-descriptions-item label="课程">
          <span
            class="mr-6px inline-block h-10px w-10px rounded-full"
            :style="{ backgroundColor: detail.color }"
          ></span>
          {{ detail.courseName }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="detail.status === 1 ? 'danger' : 'success'">
            {{ detail.status === 1 ? '停课' : '正常' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="上课时间">
          {{ formatBizRange(detail.startTime, detail.endTime) }}
        </el-descriptions-item>
        <el-descriptions-item label="教师">{{ detail.teacherName }}</el-descriptions-item>
        <el-descriptions-item label="教室">{{ detail.classroomName }}</el-descriptions-item>
        <el-descriptions-item label="班级">
          {{ (detail.classNames || []).join('、') }}
        </el-descriptions-item>
        <el-descriptions-item label="编号">
          课次 {{ detail.id }} / 学期 {{ detail.semesterId }} / 课程 {{ detail.courseId }} / 教师
          {{ detail.teacherId }} / 教室 {{ detail.classroomId }} / 班级
          {{ (detail.classIds || []).join('、') }}
        </el-descriptions-item>
      </template>
    </el-descriptions>
    <template #footer>
      <template v-if="detail">
        <el-button
          v-if="rescheduleAction(options, detail, isReadonly) === 'update'"
          type="primary"
          @click="emitAndClose('edit')"
          v-hasPermi="['timetable:lesson:update']"
        >
          编辑
        </el-button>
        <el-button
          v-if="rescheduleAction(options, detail, isReadonly) === 'apply'"
          type="warning"
          @click="emitAndClose('apply')"
          v-hasPermi="['timetable:change-request:create']"
        >
          申请调停课
        </el-button>
        <el-button
          v-if="!isReadonly"
          type="danger"
          @click="emitAndClose('delete')"
          v-hasPermi="['timetable:lesson:delete']"
        >
          删除
        </el-button>
      </template>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableId } from '@/api/timetable/types'
import { findSemester, type ReferenceOptions } from '@/api/timetable/reference'
import { formatBizRange } from '../utils'
import { rescheduleAction } from '../reference'

defineOptions({ name: 'TimetableLessonDetail' })

const props = defineProps<{ readonly: boolean; options: ReferenceOptions | null }>()
const emit = defineEmits<{
  edit: [lesson: LessonApi.LessonVO]
  apply: [lesson: LessonApi.LessonVO]
  delete: [lesson: LessonApi.LessonVO]
}>()

const dialogVisible = ref(false)
const loading = ref(false)
const detail = ref<LessonApi.LessonVO>()

const isReadonly = computed(
  () =>
    props.readonly ||
    !props.options ||
    !detail.value ||
    findSemester(props.options, detail.value.semesterId)?.archived !== false
)

/** 打开弹窗，每次获取最新详情 */
const open = async (id: TimetableId) => {
  dialogVisible.value = true
  detail.value = undefined
  loading.value = true
  try {
    detail.value = await LessonApi.getLesson(id)
  } catch {
    dialogVisible.value = false
  } finally {
    loading.value = false
  }
}
defineExpose({ open })

const emitAndClose = (action: 'edit' | 'apply' | 'delete') => {
  if (isReadonly.value || !detail.value) return
  const lesson = detail.value!
  dialogVisible.value = false
  if (action === 'edit') emit('edit', lesson)
  else if (action === 'apply') emit('apply', lesson)
  else emit('delete', lesson)
}
</script>
