<template>
  <!-- 日期切换 -->
  <div class="mb-12px flex flex-wrap items-center gap-8px">
    <el-button-group>
      <el-button @click="anchor = shiftAnchor(mode, anchor, -1)">
        <Icon icon="ep:arrow-left" />
      </el-button>
      <el-button @click="anchor = defaultAnchor()">今天</el-button>
      <el-button @click="anchor = shiftAnchor(mode, anchor, 1)">
        <Icon icon="ep:arrow-right" />
      </el-button>
    </el-button-group>
    <el-date-picker
      v-model="anchor"
      :type="mode === 'month' ? 'month' : 'date'"
      :value-format="DATE_FORMAT"
      :clearable="false"
      class="!w-160px"
    />
    <span class="text-16px font-bold">{{ viewTitle(mode, anchor) }}</span>
    <span v-if="effectiveRange" class="text-12px text-[var(--el-text-color-secondary)]">
      查询区间：{{ effectiveRange.startDate }} ~ {{ effectiveRange.endDate }}，共
      {{ lessons.length }} 个课次
    </span>
    <span v-if="dragEnabled" class="text-12px text-[var(--el-text-color-secondary)]">
      可拖动课次卡片到新时间（按 30 分钟对齐），松开后需在弹窗中确认
    </span>
  </div>

  <el-alert
    v-if="semesterState === 'failed'"
    class="mb-8px"
    type="error"
    :closable="false"
    title="学期信息加载失败（具体原因见错误提示），无法确定学期边界；查询越界时以后端校验提示为准。"
  />
  <el-alert
    v-if="!baseQuery"
    class="mb-8px"
    type="warning"
    :closable="false"
    title="查询条件不完整：按班级或教室查询时请选择目标后点击搜索。"
  />
  <el-alert
    v-else-if="semesterState === 'ready' && !effectiveRange"
    class="mb-8px"
    type="warning"
    :closable="false"
    title="该视图区间不在所选学期内（或不在“日期范围”内），未发起查询。"
  />
  <el-alert v-if="errorText" class="mb-8px" type="error" :closable="false" :title="errorText" />

  <div v-loading="loading || semesterState === 'loading'">
    <MonthGridView
      v-if="mode === 'month'"
      :month="anchor.slice(0, 7)"
      :dates="dates"
      :segments="segments"
      :active-range="effectiveRange"
      @select="(lesson) => emit('select', lesson)"
    />
    <TimeGridView
      v-else
      :dates="dates"
      :segments="segments"
      :active-range="effectiveRange"
      :drop-range="semesterRange"
      :can-drag="dragEnabled ? canDrag : undefined"
      @select="(lesson) => emit('select', lesson)"
      @reschedule="(lesson, startTime) => emit('reschedule', lesson, startTime)"
    />
  </div>
</template>
<script lang="ts" setup>
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import { bizToday, DATE_FORMAT, intersectRange } from '../utils'
import { clampDate } from '../reference'
import {
  buildSegments,
  type CalendarMode,
  displayDates,
  shiftAnchor,
  viewRange,
  viewTitle
} from './calendar'
import TimeGridView from './components/TimeGridView.vue'
import MonthGridView from './components/MonthGridView.vue'

defineOptions({ name: 'TimetableLessonCalendar' })

const props = defineProps<{
  mode: CalendarMode
  baseQuery: LessonApi.LessonQueryReqVO | null // 不含日期；为 null 表示筛选条件无效
  filterRange: TimetableDateRange | null // 筛选中的“日期范围”
  semesterRange: TimetableDateRange | null // 所选学期边界
  semesterState: 'loading' | 'ready' | 'failed' // 学期信息加载状态
  canDrag?: (lesson: LessonApi.LessonVO) => boolean // 未提供表示不可拖拽
}>()
const emit = defineEmits<{
  select: [lesson: LessonApi.LessonVO]
  reschedule: [lesson: LessonApi.LessonVO, startTime: number]
}>()

/** 默认日期：今天夹取到所选学期内 */
const defaultAnchor = () =>
  props.semesterRange ? clampDate(bizToday(), props.semesterRange) : bizToday()

const anchor = ref(defaultAnchor())
const loading = ref(false)
const errorText = ref('')
const lessons = ref<LessonApi.LessonVO[]>([])

// 仅桌面周视图启用拖拽；触屏等不支持精确指针的设备保留表单操作
const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? true
const dragEnabled = computed(() => props.mode === 'week' && !!props.canDrag && finePointer)

/** 实际查询区间 = 视图区间 ∩ 日期范围 ∩ 学期范围，绝不为补满网格越界查询 */
const effectiveRange = computed(() => {
  const range = intersectRange(viewRange(props.mode, anchor.value), props.filterRange)
  return range ? intersectRange(range, props.semesterRange) : null
})
const dates = computed(() => displayDates(props.mode, anchor.value))
const segments = computed(() => buildSegments(lessons.value, dates.value))

// 切换学期后重新定位到学期内日期
watch(
  () => JSON.stringify([props.baseQuery?.semesterId, props.semesterRange]),
  () => (anchor.value = defaultAnchor())
)

// 请求序号：日期或学期快速切换时丢弃过期响应，避免旧数据覆盖新条件
let requestSeq = 0
const load = async () => {
  const seq = ++requestSeq
  errorText.value = ''
  lessons.value = []
  const range = effectiveRange.value
  // 学期信息加载中不查询，避免以“今天”越界请求
  if (!props.baseQuery || !range || props.semesterState === 'loading') {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = await LessonApi.getLessonCalendar({ ...props.baseQuery, ...range })
    if (seq !== requestSeq) return
    lessons.value = data || []
  } catch {
    if (seq !== requestSeq) return
    errorText.value = '课表查询失败（具体原因见错误提示），请调整学期或日期范围后重新搜索。'
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

watch(
  () => JSON.stringify([props.baseQuery, effectiveRange.value, props.semesterState]),
  () => load(),
  { immediate: true }
)

defineExpose({ refresh: load, effectiveRange })
</script>
