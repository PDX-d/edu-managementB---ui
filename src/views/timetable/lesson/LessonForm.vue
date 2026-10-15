<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle" width="760px">
    <el-alert
      v-if="versionChanged"
      class="mb-12px"
      type="warning"
      :closable="false"
      show-icon
      title="课次已被他人修改，表单已刷新为最新内容，请重新确认后再保存。"
    />
    <el-alert
      v-if="dragHint"
      class="mb-12px"
      type="info"
      :closable="false"
      show-icon
      :title="dragHint"
    />
    <el-alert
      v-if="optionsFailed"
      class="mb-12px"
      type="error"
      :closable="false"
      title="公共选项加载失败（具体原因见错误提示），无法选择学期、课程、教师和班级"
    />
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="90px"
    >
      <LessonFields v-model="formData" :options="options" :labels="labels" />
      <el-row :gutter="16">
        <el-col :span="12">
          <el-form-item label="开始时间" prop="startTime">
            <el-date-picker
              v-model="formData.startTime"
              type="datetime"
              :value-format="DATE_TIME_FORMAT"
              :disabled-date="semesterDisabledDate(semester)"
              placeholder="选择开始时间"
              class="!w-full"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="结束时间" prop="endTime">
            <el-date-picker
              v-model="formData.endTime"
              type="datetime"
              :value-format="DATE_TIME_FORMAT"
              :disabled-date="semesterDisabledDate(semester, true)"
              placeholder="选择结束时间"
              class="!w-full"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <div v-if="summary" class="mb-12px text-12px text-[var(--el-text-color-secondary)]">
        当前课次：{{ summary }}
      </div>
      <ConflictResult :conflicts="conflicts" />
    </el-form>
    <template #footer>
      <el-button :loading="checking" :disabled="formLoading || !options" @click="handleCheck">
        冲突预检
      </el-button>
      <el-button :disabled="formLoading || checking || !options" type="primary" @click="submitForm">
        确 定
      </el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
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
import { checkLessonTime, semesterDisabledDate, useReferenceOptions } from '../reference'
import LessonFields, { type LessonFieldsValue } from './components/LessonFields.vue'
import ConflictResult from './components/ConflictResult.vue'

defineOptions({ name: 'TimetableLessonForm' })

interface LessonFormData extends LessonFieldsValue {
  startTime: string
  endTime: string
}

/** 打开参数：semesterId 为新增默认学期；startTime 为拖拽得到的新开始时间（保留原时长） */
export interface LessonFormDefaults {
  semesterId?: string
  startTime?: number
}

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗
const { options, failed: optionsFailed, load: loadOptions, semesterOf } = useReferenceOptions()

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref<LessonFormData>(emptyForm())
const formRef = ref() // 表单 Ref
const checking = ref(false) // 冲突预检中
const conflicts = ref<LessonApi.ConflictVO[] | null>(null) // 冲突预检结果，null 表示尚未预检
const versionChanged = ref(false) // 是否因版本变化刷新过表单
const latest = ref<LessonApi.LessonVO>() // 修改时最新的课次详情（提供 id、version）
const dragStart = ref<number>() // 拖拽预填的新开始时间
const dragHint = ref('')

const semester = computed(() =>
  formData.value.semesterId ? semesterOf(formData.value.semesterId) : undefined
)

type Callback = (error?: Error) => void
const required = (label: string, trigger = 'change') => ({
  required: true,
  message: `${label}不能为空`,
  trigger
})
const formRules = reactive({
  semesterId: [required('学期')],
  courseId: [required('课程')],
  teacherId: [required('教师')],
  classroomId: [required('教室')],
  classIds: [
    { required: true, type: 'array', min: 1, message: '至少选择一个班级', trigger: 'change' }
  ],
  startTime: [required('开始时间')],
  endTime: [
    required('结束时间'),
    {
      trigger: 'change',
      validator: (_rule: unknown, value: string, callback: Callback) => {
        const start = formData.value.startTime
        if (!start || !value) return callback()
        const error = checkLessonTime(parseBizTime(start), parseBizTime(value), semester.value)
        callback(error ? new Error(error) : undefined)
      }
    }
  ]
})

const labels = computed(() => {
  const lesson = latest.value
  if (!lesson) return undefined
  const classNames: Record<string, string> = {}
  lesson.classIds?.forEach((id, i) => (classNames[idKey(id)] = lesson.classNames?.[i]))
  return {
    courseName: lesson.courseName,
    teacherName: lesson.teacherName,
    classroomName: lesson.classroomName,
    classNames
  }
})
const summary = computed(() => {
  const lesson = latest.value
  if (!lesson) return ''
  return `${lesson.courseName} / ${lesson.teacherName} / ${formatBizRange(lesson.startTime, lesson.endTime)}`
})

function emptyForm(): LessonFormData {
  return {
    semesterId: '',
    courseId: '',
    teacherId: '',
    classroomId: '',
    classIds: [],
    startTime: '',
    endTime: ''
  }
}

/** 用最新详情填充表单；有拖拽目标时，按最新详情的原时长预填新时间，其他字段保持原值 */
const fillForm = (lesson: LessonApi.LessonVO) => {
  latest.value = lesson
  let start = lesson.startTime
  let end = lesson.endTime
  if (dragStart.value !== undefined) {
    start = dragStart.value
    end = start + (lesson.endTime - lesson.startTime)
    dragHint.value = `已按拖动位置预填新时间（原时间 ${formatBizRange(lesson.startTime, lesson.endTime)}），确认保存后才会生效；取消不会改变课表。`
  }
  formData.value = {
    semesterId: idKey(lesson.semesterId),
    courseId: idKey(lesson.courseId),
    teacherId: idKey(lesson.teacherId),
    classroomId: idKey(lesson.classroomId),
    classIds: (lesson.classIds || []).map((id) => idKey(id)),
    startTime: formatBizTime(start),
    endTime: formatBizTime(end)
  }
}

/** 打开弹窗；修改时先获取最新详情，保留 version。选项与详情并行加载，加载完成前不做任何清空 */
const open = async (type: 'create' | 'update', id?: TimetableId, defaults?: LessonFormDefaults) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  dragStart.value = defaults?.startTime
  formLoading.value = true
  try {
    if (type === 'create') {
      await loadOptions()
      formData.value.semesterId =
        defaults?.semesterId || idKey(options.value?.currentSemesterId) || ''
      return
    }
    const [lesson] = await Promise.all([LessonApi.getLesson(id!), loadOptions()])
    if (lesson.status !== 0) {
      message.warning('停课课次不能修改')
      dialogVisible.value = false
      return
    }
    if (semesterOf(lesson.semesterId)?.archived) {
      message.warning('该课次所在学期已归档，只读')
      dialogVisible.value = false
      return
    }
    fillForm(lesson)
  } catch {
    dialogVisible.value = false
  } finally {
    formLoading.value = false
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 组装保存请求：新增不带 id、version，修改带最新详情中的 id、version 及完整字段 */
const buildRequest = (): LessonApi.LessonSaveReqVO => {
  const data = formData.value
  const req: LessonApi.LessonSaveReqVO = {
    semesterId: toIdValue(data.semesterId),
    courseId: toIdValue(data.courseId),
    teacherId: toIdValue(data.teacherId),
    classroomId: toIdValue(data.classroomId),
    classIds: data.classIds.map((id) => toIdValue(id)),
    startTime: parseBizTime(data.startTime),
    endTime: parseBizTime(data.endTime)
  }
  if (formType.value === 'update' && latest.value) {
    req.id = latest.value.id
    req.version = latest.value.version
  }
  return req
}

/** 冲突预检；返回 null 表示预检请求失败 */
const runCheck = async (): Promise<LessonApi.ConflictVO[] | null> => {
  checking.value = true
  try {
    conflicts.value = (await LessonApi.checkLessonConflict(buildRequest())) || []
    return conflicts.value
  } catch {
    conflicts.value = null
    return null
  } finally {
    checking.value = false
  }
}

const validate = async () => {
  if (!options.value || !semester.value) return false
  if (!formRef.value || !(await formRef.value.validate().catch(() => false))) return false
  if (semester.value?.archived) {
    message.warning('所选学期已归档，只读')
    return false
  }
  return true
}

const handleCheck = async () => {
  if (await validate()) await runCheck()
}

/** 提交表单：先预检，有冲突时禁止提交；保存失败保留输入，不留下任何“已保存”状态 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  if (!(await validate())) return
  formLoading.value = true
  try {
    const result = await runCheck()
    if (!result) return
    if (result.length) {
      message.error('存在排课冲突，禁止提交')
      return
    }
    const data = buildRequest()
    try {
      if (formType.value === 'create') {
        await LessonApi.createLesson(data)
        message.success(t('common.createSuccess'))
      } else {
        await LessonApi.updateLesson(data)
        message.success(t('common.updateSuccess'))
      }
    } catch {
      await handleSaveFailure(data)
      return
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 修改失败后核对版本：版本已变化则刷新为最新详情并要求重新确认，不自动覆盖或重试 */
const handleSaveFailure = async (data: LessonApi.LessonSaveReqVO) => {
  if (formType.value !== 'update' || !data.id) return
  try {
    const fresh = await LessonApi.getLesson(data.id)
    if (idKey(fresh.version) !== idKey(data.version)) {
      fillForm(fresh)
      await nextTick()
      conflicts.value = null
      versionChanged.value = true
    }
  } catch {}
}

// 表单内容变化后，旧的预检结果不再有效
watch(
  formData,
  () => {
    conflicts.value = null
  },
  { deep: true }
)

// 更换学期后不平移已填时间，只重新校验是否位于新学期内
watch(
  () => formData.value.semesterId,
  () => {
    if (formData.value.startTime && formData.value.endTime) {
      nextTick(() => formRef.value?.validateField(['endTime']).catch(() => {}))
    }
  }
)

/** 重置表单 */
const resetForm = () => {
  formData.value = emptyForm()
  latest.value = undefined
  versionChanged.value = false
  dragStart.value = undefined
  dragHint.value = ''
  formRef.value?.resetFields()
  nextTick(() => (conflicts.value = null))
}
</script>
