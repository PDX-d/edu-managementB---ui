<template>
  <ContentWrap>
    <el-form
      :model="params"
      :inline="true"
      label-width="68px"
      class="-mb-15px"
      @submit.prevent="search"
    >
      <el-form-item label="房间"
        ><DormPicker v-model="params.roomId" kind="room" class="!w-240px"
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
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button @click="clear"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button
        ><el-button
          v-if="staff && can('hygiene:update')"
          type="primary"
          plain
          @click="formRef?.open()"
          ><Icon icon="ep:plus" class="mr-5px" />新增评分</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load" />
    <el-table v-loading="loading" :data="rows"
      ><el-table-column prop="checkDate" label="检查日期" width="140" /><el-table-column
        prop="roomLabel"
        label="房间"
        min-width="200"
      /><el-table-column prop="score" label="评分" width="100" /><el-table-column
        label="结果"
        width="110"
        ><template #default="{ row }"
          ><el-tag :type="row.score < 60 ? 'danger' : 'success'">{{
            row.score < 60 ? '不合格' : '合格'
          }}</el-tag></template
        ></el-table-column
      ><el-table-column
        prop="remark"
        label="备注"
        min-width="200"
        show-overflow-tooltip
      /><el-table-column label="操作" width="160" fixed="right"
        ><template #default="{ row }"
          ><el-button link type="primary" @click="detailRef?.open('hygiene', row.id)"
            >详情</el-button
          ><el-button
            v-if="staff && can('hygiene:update')"
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
  <HygieneForm ref="formRef" @success="load" /><RecordDetail ref="detailRef" />
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import { can, query, useDormList } from '../useDorm'
import DormPicker from '../components/DormPicker.vue'
import ListState from '../components/ListState.vue'
import RecordDetail from '../components/RecordDetail.vue'
import HygieneForm from './HygieneForm.vue'
defineProps<{ staff: boolean }>()
const params = reactive(query())
const range = ref<string[]>()
watch(range, (v) => {
  params.startDate = v?.[0]
  params.endDate = v?.[1]
})
const { rows, total, loading, failed, load, search, reset } = useDormList(
  params,
  Api.hygienePage,
  'hygiene:query'
)
const clear = () => {
  range.value = undefined
  return reset()
}
const formRef = ref<InstanceType<typeof HygieneForm>>()
const detailRef = ref<InstanceType<typeof RecordDetail>>()
</script>
