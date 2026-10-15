<template>
  <!-- 搜索 -->
  <ContentWrap>
    <el-alert
      v-if="optionsFailed"
      class="mb-12px"
      type="error"
      :closable="false"
      title="公共选项加载失败，无法查询或排课；请确认后端公共数据配置后重试。"
    >
      <el-button link type="primary" @click="loadReferences">重新加载</el-button>
    </el-alert>
    <el-tag v-if="options?.mock" type="warning" class="mb-12px">本地模拟公共数据</el-tag>
    <el-tag v-if="semester?.archived" type="info" class="mb-12px ml-8px">归档学期只读</el-tag>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="学期" prop="semesterId">
        <el-select
          v-model="queryParams.semesterId"
          :loading="optionsLoading"
          placeholder="请选择学期"
          class="!w-300px"
          @change="queryParams.dateRange = []"
        >
          <el-option
            v-for="item in options?.semesters || []"
            :key="idKey(item.id)"
            :label="semesterLabel(item)"
            :value="idKey(item.id)"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="查询维度" prop="dimension">
        <el-select v-model="queryParams.dimension" class="!w-140px" @change="handleDimensionChange">
          <el-option
            v-for="item in DIMENSION_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="queryParams.dimension === 'CLASS'" label="班级" prop="targetId">
        <el-select
          v-model="queryParams.targetId"
          placeholder="请选择班级"
          filterable
          clearable
          class="!w-160px"
        >
          <el-option
            v-for="item in options?.classes || []"
            :key="idKey(item.id)"
            :label="item.name"
            :value="idKey(item.id)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="queryParams.dimension === 'CLASSROOM'" label="教室" prop="targetId">
        <div class="w-240px"><ClassroomPicker v-model="queryParams.targetId" /></div>
      </el-form-item>
      <el-form-item label="日期范围" prop="dateRange">
        <el-date-picker
          v-model="queryParams.dateRange"
          type="daterange"
          :value-format="DATE_FORMAT"
          :disabled-date="semesterDisabledDate(querySemester)"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable class="!w-120px">
          <el-option
            v-for="item in LESSON_STATUS_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          v-if="!readonly"
          type="primary"
          plain
          @click="formRef.open('create', undefined, { semesterId: applied.semesterId })"
          v-hasPermi="['timetable:lesson:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          v-if="!readonly"
          type="primary"
          plain
          @click="batchFormRef.open({ semesterId: applied.semesterId })"
          v-hasPermi="['timetable:lesson:create']"
        >
          <Icon icon="ep:calendar" class="mr-5px" /> 批量排课
        </el-button>
        <LessonExport class="ml-12px" :base-query="baseQuery" :range="exportRange" />
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 / 课表 -->
  <ContentWrap>
    <el-radio-group v-model="viewMode" class="mb-12px">
      <el-radio-button value="week">周视图</el-radio-button>
      <el-radio-button value="day">日视图</el-radio-button>
      <el-radio-button value="month">月视图</el-radio-button>
      <el-radio-button value="list">列表</el-radio-button>
    </el-radio-group>
    <LessonTable
      v-if="viewMode === 'list'"
      ref="tableRef"
      :base-query="baseQuery"
      :filter-range="filterRange"
      :readonly="readonly"
      :options="options"
      @detail="(row) => detailRef.open(row.id)"
      @edit="(row) => formRef.open('update', row.id)"
      @apply="(row) => changeFormRef.open(row.id)"
      @delete="handleDelete"
    />
    <LessonCalendar
      v-else
      ref="calendarRef"
      :mode="viewMode"
      :base-query="baseQuery"
      :filter-range="filterRange"
      :semester-range="semesterRange"
      :semester-state="semesterState"
      :can-drag="readonly ? undefined : canDrag"
      @select="(lesson) => detailRef.open(lesson.id)"
      @reschedule="handleReschedule"
    />
  </ContentWrap>

  <!-- 弹窗 -->
  <LessonForm ref="formRef" @success="refresh" />
  <LessonBatchForm ref="batchFormRef" @success="refresh" />
  <LessonDetail
    ref="detailRef"
    :readonly="readonly"
    :options="options"
    @edit="(lesson) => formRef.open('update', lesson.id)"
    @apply="(lesson) => changeFormRef.open(lesson.id)"
    @delete="handleDelete"
  />
  <ChangeRequestForm ref="changeFormRef" @success="refresh" />
</template>
<script lang="ts" setup>
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import {
  rescheduleAction,
  semesterDisabledDate,
  semesterLabel,
  semesterRange as referenceRange,
  useReferenceOptions
} from '../reference'
import {
  DATE_FORMAT,
  DIMENSION_OPTIONS,
  idKey,
  isPositiveId,
  LESSON_STATUS_OPTIONS,
  toIdValue
} from '../utils'
import type { CalendarMode } from './calendar'
import LessonTable from './LessonTable.vue'
import LessonCalendar from './LessonCalendar.vue'
import LessonForm from './LessonForm.vue'
import LessonBatchForm from './LessonBatchForm.vue'
import LessonDetail from './LessonDetail.vue'
import LessonExport from './LessonExport.vue'
import ChangeRequestForm from '../change-request/ChangeRequestForm.vue'
import ClassroomPicker from './components/ClassroomPicker.vue'

defineOptions({ name: 'TimetableLesson' })

interface LessonFilter {
  semesterId: string
  dimension: LessonApi.LessonDimension
  targetId: string
  dateRange: string[]
  status?: number
}

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化
const {
  options,
  loading: optionsLoading,
  failed: optionsFailed,
  load: loadOptions,
  semesterOf
} = useReferenceOptions()

const emptyFilter = (): LessonFilter => ({
  semesterId: idKey(options.value?.currentSemesterId),
  dimension: 'SELF',
  targetId: '',
  dateRange: [],
  status: undefined
})
const queryParams = reactive<LessonFilter>(emptyFilter()) // 表单中编辑的条件
const applied = ref<LessonFilter>(emptyFilter()) // 已生效的条件，列表、课表、导出共用
const queryFormRef = ref()
const viewMode = ref<CalendarMode | 'list'>('week')
const querySemester = computed(() => semesterOf(queryParams.semesterId))
const semester = computed(() => semesterOf(applied.value.semesterId))
const semesterRange = computed(() => referenceRange(semester.value))
const semesterState = computed(() => {
  if (optionsFailed.value) return 'failed'
  return optionsLoading.value || !options.value ? 'loading' : 'ready'
})
const readonly = computed(() => !semester.value || semester.value.archived)

const formRef = ref()
const batchFormRef = ref()
const detailRef = ref()
const changeFormRef = ref()
const tableRef = ref()
const calendarRef = ref()

/** 不含日期的公共查询条件；SELF 维度不提交目标 ID */
const baseQuery = computed<LessonApi.LessonQueryReqVO | null>(() => {
  const filter = applied.value
  if (!options.value || !semester.value || !filter.semesterId) return null
  if (filter.dimension !== 'SELF' && !isPositiveId(filter.targetId)) return null
  return {
    semesterId: filter.semesterId ? toIdValue(filter.semesterId) : undefined,
    dimension: filter.dimension,
    targetId: filter.dimension === 'SELF' ? undefined : toIdValue(filter.targetId),
    status: filter.status
  }
})
const filterRange = computed<TimetableDateRange | null>(() => {
  const range = applied.value.dateRange
  return range?.length === 2 ? { startDate: range[0], endDate: range[1] } : null
})
/** 导出区间与当前页面展示一致：课表视图取实际查询区间，列表取日期范围 */
const exportRange = computed<TimetableDateRange | null>(() => {
  if (viewMode.value === 'list') return filterRange.value || semesterRange.value
  return calendarRef.value?.effectiveRange ?? null
})

const handleDimensionChange = () => {
  queryParams.targetId = ''
}

/** 校验并应用查询条件 */
const handleQuery = async () => {
  const semesterId = idKey(queryParams.semesterId)
  const selected = semesterId ? semesterOf(semesterId) : undefined
  if (!selected) {
    message.warning('请选择有效的学期')
    return
  }
  if (queryParams.dimension !== 'SELF' && !isPositiveId(queryParams.targetId)) {
    message.warning(`请选择${queryParams.dimension === 'CLASS' ? '班级' : '教室'}`)
    return
  }
  const dates = queryParams.dateRange || []
  if (
    dates.length === 2 &&
    (dates[0] < selected.startDate || dates[1] > selected.endDate || dates[0] > dates[1])
  ) {
    message.warning('查询日期范围必须位于所选学期内')
    return
  }
  const next: LessonFilter = {
    ...queryParams,
    semesterId,
    targetId: queryParams.dimension === 'SELF' ? '' : idKey(queryParams.targetId),
    dateRange: [...(queryParams.dateRange || [])]
  }
  const unchanged = JSON.stringify(next) === JSON.stringify(applied.value)
  applied.value = next
  // 条件未变化时子组件不会自动重新查询，手动刷新
  if (unchanged) refresh()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value?.resetFields()
  Object.assign(queryParams, emptyFilter())
  handleQuery()
}

/** 刷新当前视图 */
const refresh = () => {
  if (viewMode.value === 'list') tableRef.value?.refresh()
  else calendarRef.value?.refresh()
}

/** 删除课次；有待审批申请时后端会拒绝 */
const handleDelete = async (lesson: LessonApi.LessonVO) => {
  if (readonly.value || semesterOf(lesson.semesterId)?.archived) return
  try {
    await message.delConfirm(`确认删除课次“${lesson.courseName}”吗？`)
  } catch {
    return
  }
  try {
    await LessonApi.deleteLesson(lesson.id)
    message.success(t('common.delSuccess'))
  } catch {
    // 错误信息已由请求封装提示
  }
  refresh()
}

const canDrag = (lesson: LessonApi.LessonVO) =>
  !!rescheduleAction(options.value, lesson, readonly.value)
const handleReschedule = (lesson: LessonApi.LessonVO, startTime: number) => {
  const action = rescheduleAction(options.value, lesson, readonly.value)
  if (action === 'update') formRef.value?.open('update', lesson.id, { startTime })
  else if (action === 'apply') changeFormRef.value?.open(lesson.id, startTime)
}
const loadReferences = async () => {
  await loadOptions(true)
  if (!options.value) return
  if (!queryParams.semesterId) queryParams.semesterId = idKey(options.value.currentSemesterId)
  await handleQuery()
}
onMounted(loadReferences)
</script>
