<template>
  <ContentWrap>
    <ExamFilter
      v-model="query"
      :options="options"
      :loading="referenceLoading"
      :failed="failed"
      @reload="initialize"
      @search="search"
    >
      <template #actions
        ><el-button
          v-hasPermi="['exam:session:create']"
          type="primary"
          plain
          :disabled="!options || !!semesterOf(query.semesterId)?.archived"
          @click="formRef?.open(undefined, query.semesterId)"
          ><Icon icon="ep:plus" class="mr-5px" />新增考试</el-button
        ></template
      >
    </ExamFilter>
  </ContentWrap>
  <ContentWrap>
    <el-table v-loading="loading" :data="rows">
      <el-table-column label="考试名称" prop="name" min-width="170" show-overflow-tooltip />
      <el-table-column label="课程" prop="courseName" min-width="140" show-overflow-tooltip />
      <el-table-column label="班级" min-width="160" show-overflow-tooltip
        ><template #default="{ row }">{{ row.classNames.join('、') }}</template></el-table-column
      >
      <el-table-column label="考场" prop="venueName" min-width="140" show-overflow-tooltip />
      <el-table-column label="开始时间" prop="startTime" width="180" />
      <el-table-column label="结束时间" prop="endTime" width="180" />
      <el-table-column label="状态" width="110" align="center"
        ><template #default="{ row }"
          ><el-tag :type="row.archived ? 'info' : sessionLocked(row) ? 'warning' : 'success'">{{
            row.archived ? '已归档' : sessionLocked(row) ? '安排已冻结' : '待考试'
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="操作" width="200" fixed="right" align="center"
        ><template #default="{ row }">
          <el-button link type="primary" @click="detailRef?.open(row.id)">详情</el-button>
          <el-button
            v-if="!sessionLocked(row)"
            v-hasPermi="['exam:session:update']"
            link
            type="primary"
            @click="formRef?.open(row.id)"
            >编辑</el-button
          >
          <el-button
            v-if="!sessionLocked(row)"
            v-hasPermi="['exam:session:delete']"
            link
            type="danger"
            @click="remove(row)"
            >删除</el-button
          >
        </template></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      @pagination="load"
    />
  </ContentWrap>
  <SessionForm ref="formRef" @success="load" />
  <SessionDetail ref="detailRef" />
</template>
<script setup lang="ts">
import * as api from '@/api/exam'
import type { Session } from '@/api/exam/types'
import { defaultQuery, getExamPage, sessionLocked, useExam } from '../useExam'
import ExamFilter from '../components/ExamFilter.vue'
import SessionForm from './SessionForm.vue'
import SessionDetail from './SessionDetail.vue'
import { useExamSync } from '../useExamSync'

defineOptions({ name: 'ExamSession' })
const { options, loading: referenceLoading, failed, load: loadReferences, semesterOf } = useExam()
const query = ref(defaultQuery())
const applied = ref(defaultQuery())
const rows = ref<Session[]>([])
const total = ref(0)
const loading = ref(false)
const formRef = ref<InstanceType<typeof SessionForm>>()
const detailRef = ref<InstanceType<typeof SessionDetail>>()
const message = useMessage()
let revision = 0
const fetchList = async (params = { ...query.value }) => {
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  loading.value = true
  try {
    const data = await getExamPage(params, api.getSessionPage)
    if (current !== revision) return
    rows.value = data.list
    total.value = data.total
    query.value.pageNo = params.pageNo
    applied.value = params
    sync.settled(ticket)
  } catch {
    if (current === revision) {
      rows.value = []
      total.value = 0
    }
  } finally {
    if (current === revision) loading.value = false
  }
}
const load = () => fetchList()
const search = () => {
  query.value.pageNo = 1
  void load()
}
const initialize = async () => {
  const ticket = sync.checkpoint()
  await loadReferences()
  if (!sync.isCurrent(ticket)) return
  query.value.semesterId = options.value?.currentSemesterId ?? undefined
  await load()
}
const remove = async (row: Session) => {
  const ticket = sync.checkpoint()
  try {
    await message.confirm(`确认删除考试“${row.name}”？`)
  } catch {
    return
  }
  if (!sync.isCurrent(ticket)) return
  try {
    await api.deleteSession(row.id, row.sessionVersion)
    message.success('删除成功')
  } finally {
    if (sync.isCurrent(ticket)) await load()
  }
}
const sync = useExamSync({
  matches: (change) => change.type !== 'venue',
  busy: () => loading.value,
  reload: () => fetchList({ ...applied.value }),
  reset: () => {
    revision++
    rows.value = []
    total.value = 0
    loading.value = false
    options.value = undefined
    query.value = defaultQuery()
    applied.value = defaultQuery()
  }
})
onMounted(initialize)
</script>
