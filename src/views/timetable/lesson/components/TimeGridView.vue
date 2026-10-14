<template>
  <div class="tt-grid">
    <!-- 表头 -->
    <div class="tt-grid__row tt-grid__head">
      <div class="tt-grid__gutter"></div>
      <div
        v-for="date in dates"
        :key="date"
        class="tt-grid__day-head"
        :class="{ 'is-today': date === today, 'is-out': !inRange(date) }"
      >
        <div>{{ WEEKDAY_LABELS[isoWeekday(date)] }}</div>
        <div class="text-12px">{{ date }}</div>
        <div v-if="!inRange(date)" class="text-12px">未查询</div>
      </div>
    </div>
    <!-- 时间轴 -->
    <div class="tt-grid__body">
      <div class="tt-grid__row" :style="{ height: `${(hours.end - hours.start) * HOUR_HEIGHT}px` }">
        <div class="tt-grid__gutter relative">
          <div
            v-for="hour in hours.end - hours.start"
            :key="hour"
            class="tt-grid__hour-label"
            :style="{ top: `${(hour - 1) * HOUR_HEIGHT}px` }"
          >
            {{ String(hours.start + hour - 1).padStart(2, '0') }}:00
          </div>
        </div>
        <div
          v-for="date in dates"
          :key="date"
          class="tt-grid__day"
          :class="{ 'is-out': !inRange(date) }"
          :style="{ backgroundSize: `100% ${HOUR_HEIGHT}px` }"
          @dragover="dragOver($event, date)"
          @drop="drop($event, date)"
        >
          <div
            v-for="segment in segments[date] || []"
            :key="segment.key"
            class="tt-card"
            :class="{
              'is-cancelled': segment.lesson.status === 1,
              'is-draggable': draggable(segment)
            }"
            :draggable="draggable(segment)"
            :style="cardStyle(segment)"
            :title="lessonTooltip(segment.lesson)"
            @dragstart="dragStart($event, segment)"
            @dragend="dragged = null"
            @click="emit('select', segment.lesson)"
          >
            <div class="tt-card__title">
              <el-tag v-if="segment.lesson.status === 1" type="danger" size="small" effect="dark">
                停课
              </el-tag>
              {{ segment.lesson.courseName }}
            </div>
            <div>{{ timeText(segment) }}</div>
            <div>{{ segment.lesson.teacherName }} · {{ segment.lesson.classroomName }}</div>
            <div>{{ (segment.lesson.classNames || []).join('、') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { LessonVO } from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import {
  addDays,
  bizToday,
  formatBizTime,
  isoWeekday,
  parseBizTime,
  WEEKDAY_LABELS
} from '../../utils'
import {
  hourRange,
  type LessonSegment,
  lessonColorStyle,
  lessonTooltip,
  MIN_LAYOUT_MINUTES
} from '../calendar'

defineOptions({ name: 'TimetableTimeGridView' })

const HOUR_HEIGHT = 96

const props = defineProps<{
  dates: string[]
  segments: Record<string, LessonSegment[]>
  activeRange: TimetableDateRange | null // 实际查询的日期区间，区间外的日期标记为未查询
  dropRange: TimetableDateRange | null
  canDrag?: (lesson: LessonVO) => boolean
}>()
const emit = defineEmits<{
  select: [lesson: LessonVO]
  reschedule: [lesson: LessonVO, startTime: number]
}>()

const today = bizToday()
const hours = computed(() => hourRange(props.dates.flatMap((date) => props.segments[date] || [])))

const inRange = (date: string) =>
  !!props.activeRange && date >= props.activeRange.startDate && date <= props.activeRange.endDate

const dragged = shallowRef<LessonVO | null>(null)
const draggable = (segment: LessonSegment) =>
  !segment.fromPrevDay && !segment.toNextDay && !!props.canDrag?.(segment.lesson)
const canDrop = (date: string) =>
  !!dragged.value &&
  !!props.canDrag?.(dragged.value) &&
  inRange(date) &&
  !!props.dropRange &&
  date >= props.dropRange.startDate &&
  date <= props.dropRange.endDate

const dragStart = (event: DragEvent, segment: LessonSegment) => {
  if (!draggable(segment) || !event.dataTransfer) {
    event.preventDefault()
    return
  }
  dragged.value = segment.lesson
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', String(segment.lesson.id))
}
const dragOver = (event: DragEvent, date: string) => {
  if (!canDrop(date)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
}
const drop = (event: DragEvent, date: string) => {
  if (!canDrop(date)) return
  event.preventDefault()
  const lesson = dragged.value!
  dragged.value = null
  const top = (event.currentTarget as HTMLElement).getBoundingClientRect().top
  const minutes = hours.value.start * 60 + ((event.clientY - top) / HOUR_HEIGHT) * 60
  const snapped = Math.min(1410, Math.max(0, Math.round(minutes / 30) * 30))
  const time = `${String(Math.floor(snapped / 60)).padStart(2, '0')}:${String(snapped % 60).padStart(2, '0')}:00`
  const start = parseBizTime(`${date} ${time}`)
  const end = start + lesson.endTime - lesson.startTime
  const limit = parseBizTime(`${addDays(props.dropRange!.endDate, 1)} 00:00:00`)
  if (end > limit || start === lesson.startTime) return
  emit('reschedule', lesson, start)
}

const cardStyle = (segment: LessonSegment) => {
  const top = ((segment.startMin - hours.value.start * 60) / 60) * HOUR_HEIGHT
  const minutes = Math.max(segment.endMin - segment.startMin, MIN_LAYOUT_MINUTES)
  return {
    ...lessonColorStyle(segment.lesson),
    top: `${top}px`,
    height: `${(minutes / 60) * HOUR_HEIGHT}px`,
    '--card-height': `${(minutes / 60) * HOUR_HEIGHT}px`,
    left: `${(segment.lane / segment.lanes) * 100}%`,
    width: `${100 / segment.lanes}%`
  }
}

/** 显示真实起止时间；跨日课次标注完整日期 */
const timeText = (segment: LessonSegment) => {
  const { startTime, endTime } = segment.lesson
  if (!segment.fromPrevDay && !segment.toNextDay) {
    return `${formatBizTime(startTime, 'HH:mm')}-${formatBizTime(endTime, 'HH:mm')}`
  }
  return `${formatBizTime(startTime, 'MM-DD HH:mm')} 至 ${formatBizTime(endTime, 'MM-DD HH:mm')}（跨日）`
}
</script>
<style lang="scss" scoped>
.tt-grid {
  overflow-x: auto;
  border: 1px solid var(--el-border-color-lighter);

  &__row {
    display: flex;
    min-width: 760px;
  }

  &__head {
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__body {
    max-height: 640px;
    overflow-y: auto;
  }

  &__gutter {
    flex: 0 0 56px;
    border-right: 1px solid var(--el-border-color-lighter);
  }

  &__hour-label {
    position: absolute;
    right: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  &__day-head {
    flex: 1;
    padding: 6px 0;
    text-align: center;
    border-right: 1px solid var(--el-border-color-lighter);

    &.is-today {
      font-weight: bold;
      color: var(--el-color-primary);
    }
  }

  &__day {
    position: relative;
    flex: 1;
    min-width: 96px;
    background-image: linear-gradient(
      to bottom,
      var(--el-border-color-lighter) 1px,
      transparent 1px
    );
    border-right: 1px solid var(--el-border-color-lighter);
  }

  .is-out {
    color: var(--el-text-color-placeholder);
    background-color: var(--el-fill-color-light);
  }
}

.tt-card {
  position: absolute;
  padding: 2px 4px;
  overflow: hidden;
  font-size: 12px;
  line-height: 16px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  border-left: 3px solid;
  border-radius: 4px;
  box-sizing: border-box;

  > div {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.is-draggable {
    cursor: grab;
  }

  &:hover {
    z-index: 10;
    height: auto !important;
    min-height: var(--card-height);
    box-shadow: var(--el-box-shadow-light);

    > div {
      overflow-wrap: anywhere;
      white-space: normal;
    }
  }

  &__title {
    font-weight: bold;
  }

  &.is-cancelled {
    background-image: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 6px,
      rgb(0 0 0 / 6%) 6px,
      rgb(0 0 0 / 6%) 12px
    );
    border-left-style: dashed;
    opacity: 0.75;

    .tt-card__title {
      text-decoration: line-through;
    }
  }
}
</style>
