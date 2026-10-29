<template>
  <ContentWrap>
    <el-alert
      title="汇总统计的是离校记录次数，而非去重人数；当前未返校与是否审核通过无关。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <el-form :inline="true" class="-mb-15px" label-width="68px" @submit.prevent="load">
      <el-form-item label="班级"
        ><el-select v-model="params.classId" clearable class="!w-240px"
          ><el-option
            v-for="(name, id) in classes"
            :key="id"
            :value="id"
            :label="name" /></el-select
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
      <el-form-item
        ><el-button @click="load"
          ><Icon icon="ep:search" class="mr-5px" />查询</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap
    ><ListState :failed="failed" @retry="load" /><el-table v-loading="loading" :data="rows"
      ><el-table-column prop="className" label="班级" min-width="220" /><el-table-column
        prop="totalDepartures"
        label="离校总次数"
        width="160" /><el-table-column
        prop="returned"
        label="已返校次数"
        width="160" /><el-table-column prop="outside" label="未返校次数" width="160" /></el-table
  ></ContentWrap>
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import type { Summary } from '@/api/dorm/types'
import { can, query, useScopeReset } from '../useDorm'
import ListState from '../components/ListState.vue'
defineProps<{ classes?: Record<string, string> }>()
const params = reactive(query())
const range = ref<string[]>()
const rows = ref<Summary[]>([])
const loading = ref(false)
const failed = ref(false)
let revision = 0
const load = async () => {
  const rev = ++revision
  loading.value = true
  failed.value = false
  try {
    if (!can('travel:query')) throw new Error('无查询权限')
    const result = await Api.summary({
      ...params,
      startDate: range.value?.[0],
      endDate: range.value?.[1]
    })
    if (rev === revision) rows.value = result
  } catch {
    if (rev === revision) {
      rows.value = []
      failed.value = true
    }
  } finally {
    if (rev === revision) loading.value = false
  }
}
useScopeReset(() => {
  revision++
  rows.value = []
  loading.value = false
  failed.value = true
})
onBeforeUnmount(() => revision++)
onMounted(load)
</script>
