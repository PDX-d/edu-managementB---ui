<template>
  <ContentWrap>
    <el-form
      :model="params"
      :inline="true"
      class="-mb-15px"
      label-width="68px"
      @submit.prevent="search"
    >
      <el-form-item v-if="!mine" label="学生"
        ><el-input
          v-model="params.keyword"
          clearable
          maxlength="100"
          placeholder="学号 / 姓名"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item v-if="!mine" label="班级"
        ><el-select v-model="params.classId" clearable class="!w-240px"
          ><el-option
            v-for="(name, id) in classes"
            :key="id"
            :label="name"
            :value="id" /></el-select
      ></el-form-item>
      <el-form-item label="离校日期"
        ><el-date-picker
          v-model="range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-280px"
      /></el-form-item>
      <el-form-item label="出行状态"
        ><el-select v-model="params.status" clearable class="!w-240px"
          ><el-option label="在外" value="OUTSIDE" /><el-option
            label="已返校"
            value="RETURNED" /></el-select
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
      ><el-table-column prop="studentNo" label="学号" min-width="140" /><el-table-column
        prop="studentName"
        label="学生"
        width="110"
      /><el-table-column prop="className" label="班级" min-width="140" /><el-table-column
        label="离校时间"
        width="180"
        ><template #default="{ row }">{{
          formatBizTime(row.departTime)
        }}</template></el-table-column
      ><el-table-column label="返校时间" width="180"
        ><template #default="{ row }">{{
          formatBizTime(row.returnTime) || '未返校'
        }}</template></el-table-column
      ><el-table-column label="出行状态" width="100"
        ><template #default="{ row }"
          ><el-tag :type="row.returnTime ? 'success' : 'warning'">{{
            row.returnTime ? '已返校' : '在外'
          }}</el-tag></template
        ></el-table-column
      ><el-table-column label="离校审核" width="110"
        ><template #default="{ row }">{{ label(row.reviewStatus) }}</template></el-table-column
      ><el-table-column
        prop="reviewReason"
        label="审核说明"
        min-width="180"
        show-overflow-tooltip
      /><el-table-column label="操作" width="200" fixed="right"
        ><template #default="{ row }"
          ><el-button link type="primary" @click="detailRef?.open('trip', row.id)">详情</el-button
          ><el-button
            v-if="can('photo:query')"
            link
            type="primary"
            @click="photoRef?.open(row.photoId)"
            >照片</el-button
          ><el-button
            v-if="!mine && staff && row.reviewStatus === 'PENDING' && can('travel:review')"
            link
            type="primary"
            @click="reviewRef?.open(row.id)"
            >审核</el-button
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
  <RecordDetail ref="detailRef" /><PrivatePhoto ref="photoRef" /><TripReview
    ref="reviewRef"
    @success="load"
  />
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import { can, formatBizTime, label, query, useDormList } from '../useDorm'
import ListState from '../components/ListState.vue'
import RecordDetail from '../components/RecordDetail.vue'
import PrivatePhoto from './PrivatePhoto.vue'
import TripReview from './TripReview.vue'
defineProps<{ mine?: boolean; staff?: boolean; classes?: Record<string, string> }>()
const params = reactive(query())
const range = ref<string[]>()
watch(range, (v) => {
  params.startDate = v?.[0]
  params.endDate = v?.[1]
})
const { rows, total, loading, failed, load, search, reset } = useDormList(
  params,
  Api.trips,
  'travel:query'
)
const clear = () => {
  range.value = undefined
  return reset()
}
const detailRef = ref<InstanceType<typeof RecordDetail>>()
const photoRef = ref<InstanceType<typeof PrivatePhoto>>()
const reviewRef = ref<InstanceType<typeof TripReview>>()
defineExpose({ load })
</script>
