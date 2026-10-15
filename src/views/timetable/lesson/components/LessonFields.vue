<template>
  <el-alert
    v-if="options?.mock"
    class="mb-12px"
    type="warning"
    :closable="false"
    title="本地模拟公共数据：学期、课程、教师、班级来自后端模拟配置，仅用于联调"
  />
  <el-alert
    v-if="outOfRange.length"
    class="mb-12px"
    type="warning"
    :closable="false"
    :title="`原课次的${outOfRange.join('、')}已不在当前可选范围内，已保留原值展示；可重新选择，保存时以后端校验为准`"
  />
  <el-row :gutter="16">
    <el-col :span="12">
      <el-form-item label="学期" prop="semesterId">
        <el-select v-model="model.semesterId" filterable placeholder="请选择学期" class="!w-full">
          <el-option
            v-for="item in semesterOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
          />
        </el-select>
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="课程" prop="courseId">
        <el-select
          v-model="model.courseId"
          filterable
          placeholder="请选择课程"
          class="!w-full"
          @change="handleCourseChange"
        >
          <el-option
            v-for="item in courseOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
          />
        </el-select>
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="教师" prop="teacherId">
        <el-select
          v-model="model.teacherId"
          filterable
          :disabled="!model.courseId"
          :placeholder="model.courseId ? '请选择教师' : '请先选择课程'"
          class="!w-full"
        >
          <el-option
            v-for="item in teacherOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
            :disabled="item.disabled"
          />
        </el-select>
      </el-form-item>
    </el-col>
    <el-col :span="12">
      <el-form-item label="教室" prop="classroomId">
        <ClassroomPicker v-model="model.classroomId" :current-label="labels?.classroomName" />
      </el-form-item>
    </el-col>
  </el-row>
  <el-form-item label="上课班级" prop="classIds">
    <el-select
      v-model="model.classIds"
      multiple
      filterable
      :multiple-limit="MAX_CLASS_COUNT"
      :disabled="!model.courseId"
      :placeholder="model.courseId ? '可多选（合班）' : '请先选择课程'"
      class="!w-full"
    >
      <el-option
        v-for="item in classOptions"
        :key="item.value"
        :label="item.label"
        :value="item.value"
        :disabled="item.disabled"
      />
    </el-select>
  </el-form-item>
</template>
<script lang="ts" setup>
import type { ReferenceOptions } from '@/api/timetable/reference'
import type { TimetableId } from '@/api/timetable/types'
import { idKey } from '../../utils'
import { semesterLabel } from '../../reference'
import ClassroomPicker from './ClassroomPicker.vue'

defineOptions({ name: 'TimetableLessonFields' })

const MAX_CLASS_COUNT = 100

export interface LessonFieldsValue {
  semesterId: string
  courseId: string
  teacherId: string
  classroomId: string
  classIds: string[]
}

interface SelectOption {
  value: string
  label: string
  disabled: boolean
}

const model = defineModel<LessonFieldsValue>({ required: true })
const props = defineProps<{
  options: ReferenceOptions | null
  // 编辑时原课次的名称，用于展示已不在可选范围内的原值
  labels?: {
    courseName?: string
    teacherName?: string
    classroomName?: string
    classNames?: Record<string, string>
  }
}>()
const message = useMessage()

const toOptions = (items: { id: TimetableId; name: string }[]): SelectOption[] =>
  items.map((item) => ({ value: idKey(item.id), label: item.name, disabled: false }))

/** 当前值不在可选范围时保留为禁用选项展示，不静默清空或替换 */
const keepCurrent = (list: SelectOption[], values: string[], fallback: (v: string) => string) => {
  const missing = values.filter((v) => v && !list.some((item) => item.value === v))
  return [
    ...missing.map((v) => ({ value: v, label: `${fallback(v)}（不在可选范围）`, disabled: true })),
    ...list
  ]
}

const currentCourse = computed(() =>
  props.options?.courses.find((item) => idKey(item.id) === model.value.courseId)
)

const semesterOptions = computed(() => {
  // 归档学期只读，不能用于新排课或修改
  const list = (props.options?.semesters || []).map((item) => ({
    value: idKey(item.id),
    label: semesterLabel(item),
    disabled: item.archived
  }))
  return keepCurrent(list, [model.value.semesterId], (v) => `学期 ${v}`)
})

const courseOptions = computed(() =>
  keepCurrent(
    toOptions(props.options?.courses || []),
    [model.value.courseId],
    (v) => props.labels?.courseName || `课程 ${v}`
  )
)

/** 教师、班级受所选课程的 teacherIds、classIds 限制 */
const restrict = (items: { id: TimetableId; name: string }[], allowed?: TimetableId[]) => {
  if (!allowed) return toOptions(items)
  const names = new Map(items.map((item) => [idKey(item.id), item.name]))
  return allowed.map((id) => ({
    value: idKey(id),
    label: names.get(idKey(id)) || `编号 ${idKey(id)}`,
    disabled: false
  }))
}

const teacherOptions = computed(() =>
  keepCurrent(
    restrict(props.options?.teachers || [], currentCourse.value?.teacherIds),
    [model.value.teacherId],
    (v) => props.labels?.teacherName || `教师 ${v}`
  )
)

const classOptions = computed(() =>
  keepCurrent(
    restrict(props.options?.classes || [], currentCourse.value?.classIds),
    model.value.classIds,
    (v) => props.labels?.classNames?.[v] || `班级 ${v}`
  )
)

/** 已加载选项后，原值不在可选范围的字段 */
const outOfRange = computed(() => {
  if (!props.options) return []
  const result: string[] = []
  const semesterId = model.value.semesterId
  if (semesterId && !props.options.semesters.some((item) => idKey(item.id) === semesterId)) {
    result.push('学期')
  }
  const disabled = (list: SelectOption[], values: string[]) =>
    list.some((item) => item.disabled && values.includes(item.value))
  if (disabled(courseOptions.value, [model.value.courseId])) result.push('课程')
  if (disabled(teacherOptions.value, [model.value.teacherId])) result.push('教师')
  if (disabled(classOptions.value, model.value.classIds)) result.push('班级')
  return result
})

/** 用户主动更换课程：清空不再属于该课程的教师、班级并提示（仅由用户操作触发，编辑初始化不会触发） */
const handleCourseChange = () => {
  const course = currentCourse.value
  if (!course) return
  const cleared: string[] = []
  const teachers = new Set(course.teacherIds.map((id) => idKey(id)))
  if (model.value.teacherId && !teachers.has(model.value.teacherId)) {
    model.value.teacherId = ''
    cleared.push('教师')
  }
  const classes = new Set(course.classIds.map((id) => idKey(id)))
  const kept = model.value.classIds.filter((id) => classes.has(id))
  if (kept.length !== model.value.classIds.length) {
    model.value.classIds = kept
    cleared.push('班级')
  }
  if (cleared.length) {
    message.warning(`所选${cleared.join('、')}不属于该课程，已清空，请重新选择`)
  }
}
</script>
