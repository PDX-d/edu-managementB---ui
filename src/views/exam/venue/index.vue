<template>
  <ContentWrap>
    <el-form :inline="true" :model="query" class="-mb-15px" label-width="68px">
      <el-form-item label="考场名称"
        ><el-input
          v-model="query.name"
          clearable
          placeholder="请输入考场名称"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" clearable placeholder="全部状态" class="!w-240px"
          ><el-option label="启用" :value="0" /><el-option label="停用" :value="1"
        /></el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button>
        <el-button @click="reset"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <el-button v-hasPermi="['exam:venue:create']" type="primary" plain @click="formRef?.open()"
          ><Icon icon="ep:plus" class="mr-5px" />新增</el-button
        >
      </el-form-item>
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <el-table v-loading="loading" :data="rows">
      <el-table-column label="考场名称" prop="name" min-width="160" show-overflow-tooltip />
      <el-table-column label="地址" prop="address" min-width="220" show-overflow-tooltip />
      <el-table-column label="容量" prop="capacity" width="90" align="center" />
      <el-table-column label="签到半径（米）" prop="radiusMeters" width="140" align="center" />
      <el-table-column label="状态" width="90" align="center"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 0 ? 'success' : 'info'">{{
            row.status === 0 ? '启用' : '停用'
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="操作" width="200" align="center"
        ><template #default="{ row }">
          <el-button link type="primary" @click="formRef?.open(row.id, true)">详情</el-button>
          <el-button
            v-hasPermi="['exam:venue:update']"
            link
            type="primary"
            @click="formRef?.open(row.id)"
            >编辑</el-button
          >
          <el-button v-hasPermi="['exam:venue:delete']" link type="danger" @click="remove(row)"
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
  <VenueForm ref="formRef" @success="load" />
</template>
<script setup lang="ts">
import * as api from '@/api/exam'
import type { Venue } from '@/api/exam/types'
import VenueForm from './VenueForm.vue'
import { useExamSync } from '../useExamSync'
import { getExamPage } from '../useExam'

defineOptions({ name: 'ExamVenue' })
const message = useMessage()
const query = reactive<PageParam & { name?: string; status?: number }>({ pageNo: 1, pageSize: 10 })
const rows = ref<Venue[]>([])
const applied = ref({ ...query })
const total = ref(0)
const loading = ref(false)
const formRef = ref<InstanceType<typeof VenueForm>>()
let revision = 0
const fetchList = async (params = { ...query }) => {
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  loading.value = true
  try {
    params.name = params.name?.trim() || undefined
    const result = await getExamPage(params, api.getVenuePage)
    if (current !== revision) return
    rows.value = result.list
    total.value = result.total
    query.pageNo = params.pageNo
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
  query.pageNo = 1
  void load()
}
const reset = () => {
  query.name = undefined
  query.status = undefined
  search()
}
const remove = async (row: Venue) => {
  const ticket = sync.checkpoint()
  try {
    await message.confirm(`确认删除考场“${row.name}”？被考试引用的考场只能停用。`)
  } catch {
    return
  }
  if (!sync.isCurrent(ticket)) return
  try {
    await api.deleteVenue(row.id, row.version)
    message.success('删除成功')
  } finally {
    if (sync.isCurrent(ticket)) await load()
  }
}
const sync = useExamSync({
  matches: (change) => change.type === 'venue',
  busy: () => loading.value,
  reload: () => fetchList({ ...applied.value }),
  reset: () => {
    revision++
    rows.value = []
    total.value = 0
    loading.value = false
    Object.assign(query, { pageNo: 1, pageSize: 10, name: undefined, status: undefined })
    applied.value = { ...query }
  }
})
onMounted(load)
</script>
