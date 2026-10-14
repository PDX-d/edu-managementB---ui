<template>
  <Dialog v-model="dialogVisible" title="申请调停课" width="680px">
    <el-alert
      v-if="optionsFailed"
      class="mb-12px"
      type="error"
      :closable="false"
      title="公共选项加载失败，无法确认身份和学期边界，请稍后重新打开。"
    />
    <el-alert
      v-if="dragHint"
      class="mb-12px"
      type="info"
      :closable="false"
      show-icon
      :title="dragHint"
    />
    <el-descriptions v-if="lesson" :column="1" border size="small" class="mb-16px">
      <el-descriptions-item label="原课次">
        {{ lesson.courseName }}（{{ formatBizRange(lesson.startTime, lesson.endTime) }}）
      </el-descriptions-item>
      <el-descriptions-item label="教室 / 班级">
        {{ lesson.classroomName }} / {{ (lesson.classNames || []).join('、') }}
      </el-descriptions-item>
    </el-descriptions>
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="90px"
    >
      <el-form-item label="申请类型" prop="type">
        <el-radio-group v-model="formData.type" @change="handleTypeChange">
          <el-radio value="CHANGE">调课</el-radio>
          <el-radio value="CANCEL">停课</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="formData.type === 'CHANGE'">
        <el-form-item label="新开始时间" prop="targetStartTime">
          <el-date-picker
            v-model="formData.targetStartTime"
            type="datetime"
            :value-format="DATE_TIME_FORMAT"
            :disabled-date="semesterDisabledDate(semester)"
            placeholder="选择新的开始时间"
            class="!w-260px"
          />
        </el-form-item>
        <el-form-item label="新结束时间" prop="targetEndTime">
          <el-date-picker
            v-model="formData.targetEndTime"
            type="datetime"
            :value-format="DATE_TIME_FORMAT"
            :disabled-date="semesterDisabledDate(semester, true)"
            placeholder="选择新的结束时间"
            class="!w-260px"
          />
        </el-form-item>
        <el-form-item label="新教室" prop="targetClassroomId">
          <ClassroomPicker
            v-model="formData.targetClassroomId"
            :current-label="lesson?.classroomName"
          />
        </el-form-item>
      </template>
      <el-form-item label="申请原因" prop="reason">
        <el-input
          v-model="formData.reason"
          type="textarea"
          :rows="3"
          maxlength="1000"
          show-word-limit
          placeholder="请输入申请原因"
        />
      </el-form-item>
      <ConflictResult v-if="formData.type === 'CHANGE'" :conflicts="conflicts" />
      <div class="mt-8px text-12px text-[var(--el-text-color-secondary)]">
        申请提交后正式课表不变，需管理员审批通过后生效，并由系统通知相关学生。
      </div>
    </el-form>
    <template #footer>
      <el-button
        v-if="formData.type === 'CHANGE'"
        :loading="checking"
        :disabled="formLoading || !options"
        @click="handleCheck"
      >
        冲突预检
      </el-button>
      <el-button :disabled="formLoading || checking || !options" type="primary" @click="submitForm">
        提 交
      </el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ChangeRequestApi from '@/api/timetable/changeRequest'
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableId } from '@/api/timetable/types'
import {
  DATE_TIME_FORMAT,
  formatBizRange,
  formatBizTime,
  idKey,
  parseBizTime,
  toIdValue
} from '../utils'
import {
  checkLessonTime,
  rescheduleAction,
  semesterDisabledDate,
  useReferenceOptions
} from '../reference'
import ClassroomPicker from '../lesson/components/ClassroomPicker.vue'
import ConflictResult from '../lesson/components/ConflictResult.vue'

defineOptions({ name: 'TimetableChangeRequestForm' })

interface ChangeFormData {
  type: ChangeRequestApi.ChangeType
  targetStartTime: string
  targetEndTime: string
  targetClassroomId: string
  reason: string
}

const message = useMessage()

const dialogVisible = ref(false)
const formLoading = ref(false)
const formRef = ref()
const lesson = ref<LessonApi.LessonVO>() // 申请时获取的最新课次详情
const formData = ref<ChangeFormData>(emptyForm())
const checking = ref(false)
const conflicts = ref<LessonApi.ConflictVO[] | null>(null)
const dragHint = ref('')
const { options, failed: optionsFailed, load: loadOptions, semesterOf } = useReferenceOptions()
const semester = computed(() => (lesson.value ? semesterOf(lesson.value.semesterId) : undefined))

type Validator = (rule: unknown, value: string, callback: (error?: Error) => void) => void
const startValidator: Validator = (_rule, value, callback) => {
  if (!value) return callback(new Error('新开始时间不能为空'))
  if (parseBizTime(value) <= Date.now()) return callback(new Error('新开始时间必须晚于当前时间'))
  callback()
}
const endValidator: Validator = (_rule, value, callback) => {
  if (!value) return callback(new Error('新结束时间不能为空'))
  const start = formData.value.targetStartTime
  if (!start) return callback()
  const error = checkLessonTime(parseBizTime(start), parseBizTime(value), semester.value)
  callback(error ? new Error(error) : undefined)
}
const formRules = reactive({
  type: [{ required: true, message: '申请类型不能为空', trigger: 'change' }],
  targetStartTime: [{ required: true, validator: startValidator, trigger: 'change' }],
  targetEndTime: [{ required: true, validator: endValidator, trigger: 'change' }],
  targetClassroomId: [{ required: true, message: '新教室不能为空', trigger: 'change' }],
  reason: [{ required: true, whitespace: true, message: '申请原因不能为空', trigger: 'blur' }]
})

function emptyForm(): ChangeFormData {
  return {
    type: 'CHANGE',
    targetStartTime: '',
    targetEndTime: '',
    targetClassroomId: '',
    reason: ''
  }
}

/**
 * 打开弹窗：从本人课次进入，先获取最新课次详情
 * targetStart 为拖拽得到的新开始时间：按最新详情的原时长预填调课时间，课程、教师、班级不可修改
 */
const open = async (lessonId: TimetableId, targetStart?: number) => {
  dialogVisible.value = true
  formData.value = emptyForm()
  formRef.value?.resetFields()
  lesson.value = undefined
  dragHint.value = ''
  formLoading.value = true
  try {
    const [data] = await Promise.all([LessonApi.getLesson(lessonId), loadOptions()])
    if (!options.value) return
    if (semesterOf(data.semesterId)?.archived) {
      message.warning('该课次所在学期已归档，只读')
      dialogVisible.value = false
      return
    }
    if (!semesterOf(data.semesterId) || rescheduleAction(options.value, data, false) !== 'apply') {
      message.warning('当前课次不可申请调停课，请刷新后重试')
      dialogVisible.value = false
      return
    }
    lesson.value = data
    formData.value.targetClassroomId = idKey(data.classroomId)
    if (targetStart !== undefined) {
      formData.value.targetStartTime = formatBizTime(targetStart)
      formData.value.targetEndTime = formatBizTime(targetStart + (data.endTime - data.startTime))
      dragHint.value =
        '已按拖动位置预填新时间。提交后只生成调课申请，正式课表保持原位置，审批通过后才生效。'
    }
  } catch {
    dialogVisible.value = false
  } finally {
    formLoading.value = false
    nextTick(() => (conflicts.value = null))
  }
}
defineExpose({ open })

/** 切换为停课时清理目标时间和教室，不提交不适用字段 */
const handleTypeChange = () => {
  if (formData.value.type === 'CANCEL') {
    formData.value.targetStartTime = ''
    formData.value.targetEndTime = ''
    formData.value.targetClassroomId = ''
  } else if (lesson.value) {
    formData.value.targetClassroomId = idKey(lesson.value.classroomId)
  }
  formRef.value?.clearValidate()
}

/** 调课冲突预检：沿用原课次的课程、教师、班级，只替换时间和教室 */
const runCheck = async (): Promise<LessonApi.ConflictVO[] | null> => {
  const current = lesson.value!
  checking.value = true
  try {
    conflicts.value =
      (await LessonApi.checkLessonConflict({
        id: current.id,
        version: current.version,
        semesterId: current.semesterId,
        courseId: current.courseId,
        teacherId: current.teacherId,
        classIds: current.classIds,
        classroomId: toIdValue(formData.value.targetClassroomId),
        startTime: parseBizTime(formData.value.targetStartTime),
        endTime: parseBizTime(formData.value.targetEndTime)
      })) || []
    return conflicts.value
  } catch {
    conflicts.value = null
    return null
  } finally {
    checking.value = false
  }
}

const handleCheck = async () => {
  if (!options.value || !semester.value || semester.value.archived) return
  if (!(await formRef.value.validate().catch(() => false))) return
  await runCheck()
}

/** 提交申请，提交过程中禁止重复点击 */
const emit = defineEmits(['success'])
const submitForm = async () => {
  if (!lesson.value || !formRef.value || !options.value || !semester.value) return
  if (rescheduleAction(options.value, lesson.value, semester.value.archived) !== 'apply') return
  if (!(await formRef.value.validate().catch(() => false))) return
  formLoading.value = true
  try {
    const data = formData.value
    const req: ChangeRequestApi.ChangeCreateReqVO = {
      lessonId: lesson.value.id,
      type: data.type,
      reason: data.reason.trim()
    }
    if (data.type === 'CHANGE') {
      const result = await runCheck()
      if (!result) return
      if (result.length) {
        message.error('新时间或教室存在冲突，请调整后再提交')
        return
      }
      req.targetStartTime = parseBizTime(data.targetStartTime)
      req.targetEndTime = parseBizTime(data.targetEndTime)
      req.targetClassroomId = toIdValue(data.targetClassroomId)
    }
    await ChangeRequestApi.createChangeRequest(req)
    message.success('申请已提交，等待管理员审批')
    dialogVisible.value = false
    emit('success')
  } catch {
    // 错误信息已由请求封装提示
  } finally {
    formLoading.value = false
  }
}

// 时间或教室变化后，旧的预检结果不再有效
watch(
  () => [
    formData.value.targetStartTime,
    formData.value.targetEndTime,
    formData.value.targetClassroomId
  ],
  () => (conflicts.value = null)
)
</script>
