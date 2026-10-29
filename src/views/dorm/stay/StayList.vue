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
      label-width="68px"
      class="-mb-15px"
      @submit.prevent="search"
    >
      <el-form-item v-if="!mine" label="学生"
        ><el-input
          v-model="params.keyword"
          placeholder="学号 / 姓名"
          clearable
          maxlength="100"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item v-if="!mine" label="班级"
        ><el-select v-model="params.classId" clearable class="!w-240px"
          ><el-option
            v-for="(name, id) in options?.classes"
            :key="id"
            :label="name"
            :value="id" /></el-select
      ></el-form-item>
      <el-form-item label="状态"
        ><el-select v-model="params.status" clearable class="!w-240px"
          ><el-option
            v-for="s in ['RESERVED', 'OCCUPIED', 'CHECKED_OUT', 'CANCELLED']"
            :key="s"
            :value="s"
            :label="label(s)" /></el-select
      ></el-form-item>
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button @click="reset"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button>
        <template v-if="!mine && staff && can('stay:assign')"
          ><el-button type="primary" plain @click="assignRef?.open()">手动分配</el-button
          ><el-button type="primary" plain @click="assignRef?.open(true)"
            >自动分配</el-button
          ></template
        >
      </el-form-item>
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load" />
    <el-table v-loading="loading" :data="rows">
      <el-table-column prop="studentNo" label="学号" min-width="140" /><el-table-column
        prop="studentName"
        label="学生"
        width="110"
      /><el-table-column prop="className" label="班级" min-width="140" show-overflow-tooltip />
      <el-table-column prop="bedLabel" label="床位" min-width="200" show-overflow-tooltip />
      <el-table-column label="状态" width="100"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 'OCCUPIED' ? 'success' : 'info'">{{
            label(row.status)
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="实收押金 / 应退" min-width="160"
        ><template #default="{ row }"
          >{{ money(row.depositAmount) }} / {{ money(row.refundAmount) }}</template
        ></el-table-column
      >
      <el-table-column label="退款" width="100"
        ><template #default="{ row }">{{ label(row.refundStatus) }}</template></el-table-column
      >
      <el-table-column label="操作" :width="mine ? 160 : 330" fixed="right"
        ><template #default="{ row }">
          <el-button
            v-if="can('stay:query')"
            link
            type="primary"
            @click="detailRef?.open('stay', row.id)"
            >详情</el-button
          >
          <el-button
            v-if="mine && student && row.status === 'OCCUPIED' && can('change-request:create')"
            link
            type="primary"
            @click="moveRef?.open(row.id)"
            >申请调宿</el-button
          >
          <template v-if="!mine && staff">
            <el-button
              v-if="row.status === 'RESERVED' && can('stay:check-in')"
              link
              type="primary"
              @click="actionRef?.open('check-in', row.id)"
              >入住</el-button
            >
            <el-button
              v-if="row.status === 'RESERVED' && can('stay:cancel')"
              link
              type="danger"
              @click="actionRef?.open('cancel', row.id)"
              >取消</el-button
            >
            <el-button
              v-if="row.status === 'OCCUPIED' && can('stay:check-out')"
              link
              type="primary"
              @click="actionRef?.open('check-out', row.id)"
              >退宿</el-button
            >
            <el-button
              v-if="['RESERVED', 'OCCUPIED'].includes(row.status) && can('change-request:direct')"
              link
              type="primary"
              @click="moveRef?.open(row.id, true)"
              >调床</el-button
            >
            <el-button
              v-if="
                row.status === 'CHECKED_OUT' && row.refundStatus === 'PENDING' && can('stay:refund')
              "
              link
              type="primary"
              @click="actionRef?.open('confirm-refund', row.id)"
              >确认退款</el-button
            >
          </template>
        </template></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="params.pageNo"
      v-model:limit="params.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      @pagination="load"
    />
  </ContentWrap>
  <AssignForm ref="assignRef" @success="load" /><StayAction
    ref="actionRef"
    @success="load"
  /><MoveForm ref="moveRef" @success="load" /><RecordDetail ref="detailRef" />
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import { can, label, money, query, useDormList, useDormReferences } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import ListState from '../components/ListState.vue'
import RecordDetail from '../components/RecordDetail.vue'
import AssignForm from './AssignForm.vue'
import StayAction from './StayAction.vue'
import MoveForm from '../change-request/MoveForm.vue'
const props = defineProps<{ mine?: boolean }>()
const {
  options,
  loading: scopeLoading,
  failed: scopeFailed,
  load: loadScope,
  staff,
  student
} = useDormReferences()
const params = reactive(query())
const { rows, total, loading, failed, load, search, reset } = useDormList(
  params,
  props.mine ? Api.myStays : Api.stays,
  props.mine ? 'stay:my' : 'stay:query'
)
const assignRef = ref<InstanceType<typeof AssignForm>>()
const actionRef = ref<InstanceType<typeof StayAction>>()
const moveRef = ref<InstanceType<typeof MoveForm>>()
const detailRef = ref<InstanceType<typeof RecordDetail>>()
</script>
