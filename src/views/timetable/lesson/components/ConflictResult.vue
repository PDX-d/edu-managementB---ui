<template>
  <template v-if="conflicts">
    <el-alert
      v-if="conflicts.length === 0"
      type="success"
      :closable="false"
      show-icon
      title="预检未发现教师、教室或班级冲突"
      description="预检仅作提示，保存时后端会重新校验，仍可能因并发排课而失败。"
    />
    <template v-else>
      <el-alert
        type="error"
        :closable="false"
        show-icon
        :title="`发现 ${conflicts.length} 项冲突，禁止提交，请调整时间、教室、教师或班级后重新预检`"
      />
      <el-table :data="conflicts" size="small" class="mt-8px" max-height="240">
        <el-table-column label="冲突类型" width="130">
          <template #default="{ row }">{{ CONFLICT_TYPE_LABELS[row.type] || row.type }}</template>
        </el-table-column>
        <el-table-column label="占用时间" min-width="220">
          <template #default="{ row }">{{ formatBizRange(row.startTime, row.endTime) }}</template>
        </el-table-column>
        <el-table-column label="冲突对象" min-width="200">
          <template #default="{ row }">{{ describe(row) }}</template>
        </el-table-column>
      </el-table>
    </template>
  </template>
</template>
<script lang="ts" setup>
import type { ConflictVO } from '@/api/timetable/lesson'
import { CONFLICT_TYPE_LABELS, formatBizRange, idKey } from '../../utils'

defineOptions({ name: 'TimetableConflictResult' })

defineProps<{ conflicts: ConflictVO[] | null }>()

/** 权限范围外的冲突后端不返回 ID，只展示类型和时间，不补查 */
const describe = (row: ConflictVO) => {
  if (!idKey(row.lessonId)) return '不在可查看范围内'
  const parts = [`课次 ${row.lessonId}`]
  if (row.type === 'TEACHER' && idKey(row.teacherId)) parts.push(`教师 ${row.teacherId}`)
  if (row.type === 'CLASSROOM' && idKey(row.classroomId)) parts.push(`教室 ${row.classroomId}`)
  if (row.type === 'CLASS' && idKey(row.classId)) parts.push(`班级 ${row.classId}`)
  return parts.join('，')
}
</script>
