<template>
  <el-alert
    v-if="!baseQuery"
    class="mb-8px"
    type="warning"
    :closable="false"
    title="查询条件不完整，未发起查询。"
  />
  <el-table v-loading="loading" :data="list">
    <el-table-column label="课程" align="center" min-width="150">
      <template #default="{ row }">
        <span
          class="mr-4px inline-block h-10px w-10px rounded-full"
          :style="{ backgroundColor: row.color }"
        ></span>
        {{ row.courseName }}
      </template>
    </el-table-column>
    <el-table-column label="上课时间" align="center" min-width="230">
      <template #default="{ row }">{{ formatBizRange(row.startTime, row.endTime) }}</template>
    </el-table-column>
    <el-table-column label="教师" align="center" prop="teacherName" min-width="100" />
    <el-table-column label="教室" align="center" prop="classroomName" min-width="120" />
    <el-table-column label="班级" align="center" min-width="160" :show-overflow-tooltip="true">
      <template #default="{ row }">{{ (row.classNames || []).join('、') }}</template>
    </el-table-column>
    <el-table-column label="状态" align="center" width="90">
      <template #default="{ row }">
        <el-tag :type="row.status === 1 ? 'danger' : 'success'">
          {{ row.status === 1 ? '停课' : '正常' }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column label="操作" align="center" width="260" fixed="right">
      <template #default="{ row }">
        <el-button link type="primary" @click="emit('detail', row)">详情</el-button>
        <el-button
          v-if="rescheduleAction(options, row, readonly) === 'update'"
          link
          type="primary"
          :disabled="row.status === 1"
          @click="emit('edit', row)"
          v-hasPermi="['timetable:lesson:update']"
        >
          编辑
        </el-button>
        <el-button
          v-if="rescheduleAction(options, row, readonly) === 'apply'"
          link
          type="warning"
          :disabled="row.status === 1 || row.startTime <= Date.now()"
          @click="emit('apply', row)"
          v-hasPermi="['timetable:change-request:create']"
        >
          申请调停课
        </el-button>
        <el-button
          v-if="!readonly"
          link
          type="danger"
          @click="emit('delete', row)"
          v-hasPermi="['timetable:lesson:delete']"
        >
          删除
        </el-button>
      </template>
    </el-table-column>
  </el-table>
  <!-- 分页 -->
  <Pagination :total="total" v-model:page="pageNo" v-model:limit="pageSize" @pagination="getList" />
</template>
<script lang="ts" setup>
import * as LessonApi from '@/api/timetable/lesson'
import type { TimetableDateRange } from '@/api/timetable/types'
import type { ReferenceOptions } from '@/api/timetable/reference'
import { formatBizRange } from '../utils'
import { rescheduleAction } from '../reference'

defineOptions({ name: 'TimetableLessonTable' })

const props = defineProps<{
  baseQuery: LessonApi.LessonQueryReqVO | null
  filterRange: TimetableDateRange | null // 未选择时由后端按学期范围查询
  readonly: boolean
  options: ReferenceOptions | null
}>()
const emit = defineEmits<{
  detail: [lesson: LessonApi.LessonVO]
  edit: [lesson: LessonApi.LessonVO]
  apply: [lesson: LessonApi.LessonVO]
  delete: [lesson: LessonApi.LessonVO]
}>()

const loading = ref(false)
const list = ref<LessonApi.LessonVO[]>([])
const total = ref(0)
const pageNo = ref(1)
const pageSize = ref(10)

// 请求序号：条件快速变化时丢弃过期响应
let requestSeq = 0
const getList = async () => {
  const seq = ++requestSeq
  if (!props.baseQuery) {
    list.value = []
    total.value = 0
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = await LessonApi.getLessonPage({
      ...props.baseQuery,
      ...(props.filterRange || {}),
      pageNo: pageNo.value,
      pageSize: pageSize.value
    })
    if (seq !== requestSeq) return
    list.value = data.list
    total.value = data.total
  } catch {
    if (seq !== requestSeq) return
    list.value = []
    total.value = 0
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

// 筛选条件变化后回到第一页
watch(
  () => JSON.stringify([props.baseQuery, props.filterRange]),
  () => {
    pageNo.value = 1
    getList()
  },
  { immediate: true }
)

defineExpose({ refresh: getList })
</script>
