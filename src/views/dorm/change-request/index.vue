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
      <el-form-item label="学生"
        ><el-input
          v-model="params.keyword"
          clearable
          placeholder="学号 / 姓名"
          class="!w-240px"
          maxlength="100"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="班级"
        ><el-select v-model="params.classId" clearable class="!w-240px"
          ><el-option
            v-for="(name, id) in options?.classes"
            :key="id"
            :value="id"
            :label="name" /></el-select
      ></el-form-item>
      <el-form-item label="状态"
        ><el-select v-model="params.status" clearable class="!w-240px"
          ><el-option
            v-for="s in ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']"
            :key="s"
            :value="s"
            :label="label(s)" /></el-select
      ></el-form-item>
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button @click="reset"
          ><Icon icon="ep:refresh" class="mr-5px" />重置</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load" />
    <el-table v-loading="loading || cancelling" :data="rows">
      <el-table-column prop="studentNo" label="学号" min-width="140" /><el-table-column
        prop="studentName"
        label="学生"
        width="110"
      /><el-table-column prop="className" label="班级" min-width="140" show-overflow-tooltip />
      <el-table-column
        prop="sourceBedLabel"
        label="原床位"
        min-width="180"
        show-overflow-tooltip
      /><el-table-column
        prop="targetBedLabel"
        label="目标床位"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="来源" width="130"
        ><template #default="{ row }">{{ label(row.source) }}</template></el-table-column
      >
      <el-table-column label="状态" width="100"
        ><template #default="{ row }"
          ><el-tag
            :type="
              row.status === 'PENDING' ? 'warning' : row.status === 'APPROVED' ? 'success' : 'info'
            "
            >{{ label(row.status) }}</el-tag
          ></template
        ></el-table-column
      >
      <el-table-column prop="reason" label="原因" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="220" fixed="right"
        ><template #default="{ row }">
          <el-button link type="primary" @click="detailRef?.open('change', row.id)">详情</el-button>
          <template v-if="staff && row.status === 'PENDING' && can('change-request:approve')"
            ><el-button link type="primary" @click="reviewRef?.open(row.id, true)">通过</el-button
            ><el-button link type="danger" @click="reviewRef?.open(row.id, false)"
              >拒绝</el-button
            ></template
          >
          <el-button
            v-if="student && row.status === 'PENDING' && can('change-request:cancel')"
            link
            type="danger"
            @click="cancel(row)"
            >取消申请</el-button
          >
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
  <ChangeReview ref="reviewRef" @success="load" /><RecordDetail ref="detailRef" />
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Change } from '@/api/dorm/types'
import {
  can,
  label,
  query,
  useDormList,
  useDormReferences,
  version,
  confirmAction
} from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import ListState from '../components/ListState.vue'
import RecordDetail from '../components/RecordDetail.vue'
import ChangeReview from './ChangeReview.vue'
defineOptions({ name: 'DormChangeRequest' })
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
  Api.changes,
  'change-request:query'
)
const reviewRef = ref<InstanceType<typeof ChangeReview>>()
const detailRef = ref<InstanceType<typeof RecordDetail>>()
const cancelling = ref(false)
const cancel = async (row: Change) => {
  if (!student.value || !can('change-request:cancel') || cancelling.value) return
  if (!(await confirmAction('确认取消此待审调宿申请？')) || cancelling.value) return
  cancelling.value = true
  try {
    await Api.cancelChange(version(row))
    ElMessage.success('已取消')
    await load()
  } catch {
    return
  } finally {
    cancelling.value = false
  }
}
</script>
