<template>
  <ContentWrap>
    <el-form
      :model="params"
      :inline="true"
      class="-mb-15px"
      label-width="68px"
      @submit.prevent="search"
    >
      <el-form-item label="学生"
        ><el-input
          v-model="params.keyword"
          clearable
          maxlength="100"
          placeholder="学号 / 姓名"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="日期"
        ><el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-280px"
      /></el-form-item>
      <el-form-item label="结果"
        ><el-select v-model="params.status" clearable class="!w-240px"
          ><el-option label="在寝" value="PRESENT" /><el-option
            label="不在寝"
            value="ABSENT" /></el-select
      ></el-form-item>
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button @click="clear"
          ><Icon icon="ep:refresh" class="mr-5px" />重置</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load" />
    <el-table v-loading="loading" :data="rows"
      ><el-table-column prop="checkDate" label="查寝日期" width="120" /><el-table-column
        prop="studentNo"
        label="学号"
        min-width="140"
      /><el-table-column prop="studentName" label="学生" width="110" /><el-table-column
        prop="className"
        label="班级"
        min-width="140"
      /><el-table-column
        prop="bedLabel"
        label="当时床位"
        min-width="180"
        show-overflow-tooltip
      /><el-table-column label="结果" width="100"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 'PRESENT' ? 'success' : 'warning'">{{
            label(row.status)
          }}</el-tag></template
        ></el-table-column
      ><el-table-column
        prop="reason"
        label="原因"
        min-width="180"
        show-overflow-tooltip
      /><el-table-column label="操作" width="150" fixed="right"
        ><template #default="{ row }"
          ><el-button link type="primary" @click="detailRef?.open('night', row.id)">详情</el-button
          ><el-button
            v-if="staff && can('night-check:update')"
            link
            type="primary"
            @click="formRef?.open(row.id)"
            >更正</el-button
          ></template
        ></el-table-column
      ></el-table
    >
    <Pagination
      v-model:page="params.pageNo"
      v-model:limit="params.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      @pagination="load"
    />
  </ContentWrap>
  <NightForm ref="formRef" @success="load" /><RecordDetail ref="detailRef" />
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import { can, label, query, useDormList } from '../useDorm'
import ListState from '../components/ListState.vue'
import RecordDetail from '../components/RecordDetail.vue'
import NightForm from './NightForm.vue'
defineProps<{ staff: boolean }>()
const params = reactive(query())
const range = ref<string[]>()
watch(range, (v) => {
  params.startDate = v?.[0]
  params.endDate = v?.[1]
})
const { rows, total, loading, failed, load, search, reset } = useDormList(
  params,
  Api.nights,
  'night-check:query'
)
const clear = () => {
  range.value = undefined
  return reset()
}
const formRef = ref<InstanceType<typeof NightForm>>()
const detailRef = ref<InstanceType<typeof RecordDetail>>()
</script>
