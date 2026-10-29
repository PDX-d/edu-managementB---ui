<template>
  <ContentWrap>
    <el-alert
      title="周一至周日 / 自然月，按已检查日期的日评分均值排名，同分并列；未检查不计零分。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <el-form :inline="true" class="-mb-15px" label-width="68px" @submit.prevent="load">
      <el-form-item label="周期"
        ><el-select v-model="period" class="!w-240px"
          ><el-option label="周排名" value="WEEK" /><el-option
            label="月排名"
            value="MONTH" /></el-select
      ></el-form-item>
      <el-form-item label="基准日期"
        ><el-date-picker v-model="date" type="date" value-format="YYYY-MM-DD" :clearable="false"
      /></el-form-item>
      <el-form-item
        ><el-button @click="load"
          ><Icon icon="ep:search" class="mr-5px" />查询</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap
    ><ListState :failed="failed" @retry="load" /><div
      v-if="applied"
      class="mb-15px text-gray-500"
      >{{ applied }}</div
    ><el-table v-loading="loading" :data="rows"
      ><el-table-column prop="rank" label="排名" width="100" /><el-table-column
        prop="roomLabel"
        label="房间"
        min-width="220" /><el-table-column label="平均分" width="140"
        ><template #default="{ row }">{{
          Number(row.averageScore).toFixed(2)
        }}</template></el-table-column
      ><el-table-column prop="checkedDays" label="已检查天数" width="140" /></el-table
  ></ContentWrap>
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import type { Ranking } from '@/api/dorm/types'
import { can, today, useScopeReset } from '../useDorm'
import ListState from '../components/ListState.vue'
const period = ref('WEEK')
const date = ref(today())
const rows = ref<Ranking[]>([])
const loading = ref(false)
const failed = ref(false)
const applied = ref('')
let revision = 0
const load = async () => {
  if (!date.value) return
  const rev = ++revision
  const sent = { period: period.value, date: date.value }
  loading.value = true
  failed.value = false
  try {
    if (!can('hygiene:query')) throw new Error('无查询权限')
    const result = await Api.ranking(sent.period, sent.date)
    if (rev === revision) {
      rows.value = result
      applied.value = `${sent.date} 所在${sent.period === 'WEEK' ? '周' : '月'}的排名`
    }
  } catch {
    if (rev === revision) {
      rows.value = []
      applied.value = ''
      failed.value = true
    }
  } finally {
    if (rev === revision) loading.value = false
  }
}
useScopeReset(() => {
  revision++
  rows.value = []
  applied.value = ''
  loading.value = false
  failed.value = true
})
onBeforeUnmount(() => revision++)
onMounted(load)
</script>
