<template>
  <div class="tt-month">
    <div v-for="weekday in 7" :key="weekday" class="tt-month__head">
      {{ WEEKDAY_LABELS[weekday] }}
    </div>
    <div
      v-for="date in dates"
      :key="date"
      class="tt-month__cell"
      :class="{
        'is-other': !date.startsWith(month),
        'is-out': date.startsWith(month) && !inRange(date),
        'is-today': date === today
      }"
    >
      <div class="tt-month__date">
        {{ Number(date.slice(8)) }}
        <span v-if="date.startsWith(month) && !inRange(date)" class="text-12px">未查询</span>
      </div>
      <div class="tt-month__items">
        <div
          v-for="segment in segments[date] || []"
          :key="segment.key"
          class="tt-month__item"
          :class="{ 'is-cancelled': segment.lesson.status === 1 }"
          :style="lessonColorStyle(segment.lesson)"
          :title="lessonTooltip(segment.lesson)"
          @click="emit('select', segment.lesson)"
        >
          <el-tag v-if="segment.lesson.status === 1" type="danger" size="small" effect="dark">
            停课
          </el-tag>
          <span>{{ itemTime(segment) }}</span>
          <span class="tt-month__course">{{ segment.lesson.courseName }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import type { LessonVO } from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import { bizToday, formatBizTime, WEEKDAY_LABELS } from '../../utils'
import { type LessonSegment, lessonColorStyle, lessonTooltip } from '../calendar'

defineOptions({ name: 'TimetableMonthGridView' })

const props = defineProps<{
  month: string // YYYY-MM
  dates: string[]
  segments: Record<string, LessonSegment[]>
  activeRange: TimetableDateRange | null
}>()
const emit = defineEmits<{ select: [lesson: LessonVO] }>()

const today = bizToday()

const inRange = (date: string) =>
  !!props.activeRange && date >= props.activeRange.startDate && date <= props.activeRange.endDate

/** 跨日课次在后续日期上标注“续” */
const itemTime = (segment: LessonSegment) => {
  if (segment.fromPrevDay) return '续'
  return formatBizTime(segment.lesson.startTime, 'HH:mm')
}
</script>
<style lang="scss" scoped>
.tt-month {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  overflow-x: auto;
  border-top: 1px solid var(--el-border-color-lighter);
  border-left: 1px solid var(--el-border-color-lighter);

  &__head,
  &__cell {
    border-right: 1px solid var(--el-border-color-lighter);
    border-bottom: 1px solid var(--el-border-color-lighter);
  }

  &__head {
    padding: 6px 0;
    text-align: center;
  }

  &__cell {
    min-height: 110px;
    padding: 4px;

    &.is-other {
      background-color: var(--el-fill-color-lighter);

      .tt-month__date {
        color: var(--el-text-color-placeholder);
      }
    }

    &.is-out {
      background-color: var(--el-fill-color-light);
    }

    &.is-today .tt-month__date {
      font-weight: bold;
      color: var(--el-color-primary);
    }
  }

  &__date {
    margin-bottom: 2px;
    font-size: 13px;
  }

  // 不截断当天课次，超出时在单元格内滚动
  &__items {
    max-height: 132px;
    overflow-y: auto;
  }

  &__item {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 1px 4px;
    margin-bottom: 2px;
    font-size: 12px;
    white-space: nowrap;
    cursor: pointer;
    border-left: 3px solid;
    border-radius: 3px;

    &.is-cancelled {
      border-left-style: dashed;
      opacity: 0.75;

      .tt-month__course {
        text-decoration: line-through;
      }
    }
  }

  &__course {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
