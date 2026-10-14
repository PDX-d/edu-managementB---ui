<template>
  <Dialog v-model="dialogVisible" title="批量排课" width="760px">
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
      <LessonFields v-model="formData" :options="options" />
      <el-form-item label="日期范围" prop="dateRange">
        <el-date-picker
          v-model="formData.dateRange"
          type="daterange"
          :value-format="DATE_FORMAT"
          :disabled-date="semesterDisabledDate(semester)"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-320px"
        />
      </el-form-item>
      <el-form-item label="上课星期" prop="weekdays">
        <el-checkbox-group v-model="formData.weekdays">
          <el-checkbox v-for="day in 7" :key="day" :value="day">
            {{ WEEKDAY_LABELS[day] }}
          </el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      <el-form-item label="每日时间" prop="timeRange">
        <el-time-picker
          v-model="formData.timeRange"
          is-range
          value-format="HH:mm:ss"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          class="!w-320px"
        />
      </el-form-item>
      <el-form-item label="生成预览">
        <div class="w-full">
          <div>
            将生成 <b>{{ previewDates.length }}</b> 个课次
            <span v-if="formData.timeRange?.length === 2">
              ，每次 {{ formData.timeRange[0] }} ~ {{ formData.timeRange[1] }}
            </span>
          </div>
          <div class="max-h-120px overflow-y-auto">
            <el-tag v-for="date in previewDates" :key="date" class="mr-4px mt-4px" type="info">
              {{ date }} {{ WEEKDAY_LABELS[isoWeekday(date)] }}
            </el-tag>
          </div>
          <div class="text-12px text-[var(--el-text-color-secondary)]">
            后端整批校验冲突、学期范围及权限，任一课次不合法时整批不写入。
          </div>
        </div>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading || !options" type="primary" @click="submitForm">
        确 定
      </el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as LessonApi from '@/api/timetable/lesson'
import {
  DATE_FORMAT,
  diffDays,
  enumerateDates,
  idKey,
  isoWeekday,
  toIdValue,
  WEEKDAY_LABELS
} from '../utils'
import { semesterDisabledDate, useReferenceOptions } from '../reference'
import LessonFields, { type LessonFieldsValue } from './components/LessonFields.vue'

defineOptions({ name: 'TimetableLessonBatchForm' })

// 后端限制：结束日期与开始日期最多相差 366 天
const MAX_SPAN_DAYS = 366

interface BatchFormData extends LessonFieldsValue {
  dateRange: string[]
  weekdays: number[]
  timeRange: string[]
}

const message = useMessage() // 消息弹窗
const { options, failed: optionsFailed, load: loadOptions, semesterOf } = useReferenceOptions()

const dialogVisible = ref(false)
const formLoading = ref(false)
const formRef = ref()
const formData = ref<BatchFormData>(emptyForm())
const semester = computed(() =>
  formData.value.semesterId ? semesterOf(formData.value.semesterId) : undefined
)

type Validator = (rule: unknown, value: any, callback: (error?: Error) => void) => void
const dateRangeValidator: Validator = (_rule, value: string[], callback) => {
  if (!value || value.length !== 2) return callback(new Error('请选择日期范围'))
  if (diffDays(value[0], value[1]) > MAX_SPAN_DAYS) {
    return callback(new Error(`单批日期跨度不能超过 ${MAX_SPAN_DAYS} 天`))
  }
  const current = semester.value
  if (current && (value[0] < current.startDate || value[1] > current.endDate)) {
    return callback(
      new Error(`日期范围必须位于学期内（${current.startDate} ~ ${current.endDate}）`)
    )
  }
  callback()
}
const required = (label: string) => ({
  required: true,
  message: `${label}不能为空`,
  trigger: 'change'
})
const timeRangeValidator: Validator = (_rule, value: string[], callback) => {
  if (!value || value.length !== 2) return callback(new Error('请选择每日上课时间'))
  if (value[0] >= value[1]) return callback(new Error('每日开始时间必须早于结束时间'))
  callback()
}
const formRules = reactive({
  semesterId: [required('学期')],
  courseId: [required('课程')],
  teacherId: [required('教师')],
  classroomId: [required('教室')],
  classIds: [
    { required: true, type: 'array', min: 1, message: '至少选择一个班级', trigger: 'change' }
  ],
  dateRange: [{ required: true, validator: dateRangeValidator, trigger: 'change' }],
  weekdays: [{ required: true, type: 'array', min: 1, message: '至少选择一天', trigger: 'change' }],
  timeRange: [{ required: true, validator: timeRangeValidator, trigger: 'change' }]
})

/** 按日期范围和星期计算将生成的日期（与后端生成规则一致） */
const previewDates = computed(() => {
  const { dateRange, weekdays } = formData.value
  if (!dateRange || dateRange.length !== 2 || !weekdays.length) return []
  const [start, end] = dateRange
  if (start > end || diffDays(start, end) > MAX_SPAN_DAYS) return []
  return enumerateDates(start, end).filter((date) => weekdays.includes(isoWeekday(date)))
})

function emptyForm(): BatchFormData {
  return {
    semesterId: '',
    courseId: '',
    teacherId: '',
    classroomId: '',
    classIds: [],
    dateRange: [],
    weekdays: [],
    timeRange: []
  }
}

/** 打开弹窗，默认使用页面所选学期或当前学期 */
const open = async (defaults?: { semesterId?: string }) => {
  dialogVisible.value = true
  formData.value = emptyForm()
  formRef.value?.resetFields()
  formLoading.value = true
  try {
    await loadOptions()
    formData.value.semesterId =
      defaults?.semesterId || idKey(options.value?.currentSemesterId) || ''
  } finally {
    formLoading.value = false
  }
}
defineExpose({ open })

// 更换学期后不平移已选日期，只重新校验是否位于新学期内
watch(
  () => formData.value.semesterId,
  () => {
    if (formData.value.dateRange?.length === 2) {
      nextTick(() => formRef.value?.validateField(['dateRange']).catch(() => {}))
    }
  }
)

/** 提交：直接调用 batch-create，由后端整批校验、整批写入 */
const emit = defineEmits(['success'])
const submitForm = async () => {
  if (!formRef.value || !options.value || !semester.value) return
  if (!(await formRef.value.validate().catch(() => false))) return
  if (semester.value?.archived) {
    message.warning('所选学期已归档，只读')
    return
  }
  if (!previewDates.value.length) {
    message.warning('日期范围和上课星期未生成任何课次')
    return
  }
  try {
    await message.confirm(`确认批量生成 ${previewDates.value.length} 个课次吗？`)
  } catch {
    return
  }
  const data = formData.value
  formLoading.value = true
  try {
    const ids = await LessonApi.batchCreateLesson({
      semesterId: toIdValue(data.semesterId),
      courseId: toIdValue(data.courseId),
      teacherId: toIdValue(data.teacherId),
      classroomId: toIdValue(data.classroomId),
      classIds: data.classIds.map((id) => toIdValue(id)),
      startDate: data.dateRange[0],
      endDate: data.dateRange[1],
      weekdays: [...data.weekdays].sort(),
      startTime: data.timeRange[0],
      endTime: data.timeRange[1]
    })
    message.success(`批量排课成功，共生成 ${ids?.length ?? 0} 个课次`)
    dialogVisible.value = false
    emit('success')
  } catch {
    // 后端整批回滚，不会留下部分课次；错误信息已由请求封装提示
  } finally {
    formLoading.value = false
  }
}
</script>
