<template>
  <ScopeNotice
    :options="options"
    :loading="scopeLoading"
    :failed="scopeFailed"
    @retry="loadScope"
  />
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
      <el-form-item label="班级"
        ><el-select v-model="params.classId" clearable class="!w-240px"
          ><el-option
            v-for="(name, id) in options?.classes"
            :key="id"
            :label="name"
            :value="id" /></el-select
      ></el-form-item>
      <el-form-item label="发生日期"
        ><el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-280px"
      /></el-form-item>
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button @click="clear"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button
        ><el-button
          v-if="staff && can('violation:update')"
          type="primary"
          plain
          @click="formRef?.open()"
          ><Icon icon="ep:plus" class="mr-5px" />新增违规</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load" />
    <el-table v-loading="loading" :data="rows"
      ><el-table-column prop="studentNo" label="学号" min-width="140" /><el-table-column
        prop="studentName"
        label="学生"
        width="110"
      /><el-table-column prop="className" label="班级" min-width="140" /><el-table-column
        prop="bedLabel"
        label="住宿床位"
        min-width="180"
        show-overflow-tooltip
      /><el-table-column label="发生时间" width="180"
        ><template #default="{ row }">{{
          formatBizTime(row.occurredAt)
        }}</template></el-table-column
      ><el-table-column prop="type" label="类型" min-width="120" /><el-table-column
        prop="description"
        label="说明"
        min-width="200"
        show-overflow-tooltip
      /><el-table-column prop="disciplineId" label="外部处分 ID" width="130" /><el-table-column
        label="操作"
        width="220"
        fixed="right"
        ><template #default="{ row }"
          ><el-button link type="primary" @click="detailRef?.open('violation', row.id)"
            >详情</el-button
          ><template v-if="staff && can('violation:update')"
            ><el-button link type="primary" @click="formRef?.open(row.id)">更正</el-button
            ><el-button link type="primary" @click="formRef?.open(row.id, true)"
              >关联处分</el-button
            ></template
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
  <ViolationForm ref="formRef" @success="load" /><RecordDetail ref="detailRef" />
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import { can, formatBizTime, query, useDormList, useDormReferences } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import ListState from '../components/ListState.vue'
import RecordDetail from '../components/RecordDetail.vue'
import ViolationForm from './ViolationForm.vue'
defineOptions({ name: 'DormViolation' })
const {
  options,
  loading: scopeLoading,
  failed: scopeFailed,
  load: loadScope,
  staff
} = useDormReferences()
const params = reactive(query())
const range = ref<string[]>()
watch(range, (v) => {
  params.startDate = v?.[0]
  params.endDate = v?.[1]
})
const { rows, total, loading, failed, load, search, reset } = useDormList(
  params,
  Api.violations,
  'violation:query'
)
const clear = () => {
  range.value = undefined
  return reset()
}
const formRef = ref<InstanceType<typeof ViolationForm>>()
const detailRef = ref<InstanceType<typeof RecordDetail>>()
</script>
