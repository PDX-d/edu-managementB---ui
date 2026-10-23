<template>
  <ContentWrap>
    <ExamFilter
      v-model="query"
      :options="options"
      :loading="referenceLoading"
      :failed="failed"
      with-session
      @reload="initialize"
      @search="load"
    >
      <template #actions><ExportButton :query="query" /></template>
    </ExamFilter>
  </ContentWrap>
  <ContentWrap v-loading="loading">
    <SyncNotice :stale="sync.stale.value" :busy="loading" @refresh="sync.refresh" />
    <el-alert
      title="统计仅包含已完整录分的成绩；同一学生多场考试分别计入，不取最高分。及格线 60 分。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <template v-if="result">
      <el-row :gutter="16">
        <el-col v-for="item in metrics" :key="item.label" :xs="12" :sm="8" :lg="6" class="mb-15px"
          ><el-card shadow="never"
            ><el-statistic
              :title="item.label"
              :value="item.value ?? undefined"
              :formatter="(value) => (item.value == null ? '—' : String(value))" /></el-card
        ></el-col>
      </el-row>
      <Echart :options="chart" height="320px" />
      <el-table :data="result.bands" border
        ><el-table-column label="分数段" prop="name" /><el-table-column label="人数" prop="count"
      /></el-table>
    </template>
    <el-empty v-else description="暂无统计结果，请查询" />
  </ContentWrap>
</template>
<script setup lang="ts">
import type { EChartsOption } from 'echarts'
import { Echart } from '@/components/Echart'
import { getStatistics } from '@/api/exam'
import type { Statistics } from '@/api/exam/types'
import { defaultQuery, useExam } from '../useExam'
import ExamFilter from '../components/ExamFilter.vue'
import ExportButton from '../components/ExportButton.vue'
import SyncNotice from '../components/SyncNotice.vue'
import { useExamSync } from '../useExamSync'
import { relatesToExam } from '@/api/exam/sync'

defineOptions({ name: 'ExamStatistics' })
const { options, loading: referenceLoading, failed, load: loadReferences } = useExam()
const query = ref(defaultQuery())
const applied = ref(defaultQuery())
const loading = ref(false)
const result = ref<Statistics>()
const metrics = computed(() => {
  const r = result.value
  if (!r) return []
  return [
    { label: '应录人数', value: r.participantCount },
    { label: '已录人数', value: r.gradedCount },
    { label: '未录人数', value: r.ungradedCount },
    { label: '及格人数', value: r.passCount },
    { label: '平均分', value: r.averageScore },
    { label: '最高分', value: r.maxScore },
    { label: '最低分', value: r.minScore },
    { label: '及格率（%）', value: r.passRate }
  ]
})
const chart = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  grid: { left: 45, right: 20, bottom: 35, top: 25 },
  xAxis: { type: 'category', data: result.value?.bands.map((b) => b.name) ?? [] },
  yAxis: { type: 'value', minInterval: 1 },
  series: [
    {
      name: '人数',
      type: 'bar',
      barMaxWidth: 48,
      data: result.value?.bands.map((b) => b.count) ?? [],
      itemStyle: { color: '#409eff', borderRadius: [4, 4, 0, 0] }
    }
  ]
}))
let revision = 0
const fetchStatistics = async (params = { ...query.value }) => {
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  loading.value = true
  result.value = undefined
  try {
    const data = await getStatistics(params)
    if (current === revision) {
      result.value = data
      applied.value = params
      sync.settled(ticket)
    }
  } finally {
    if (current === revision) loading.value = false
  }
}
const load = () => fetchStatistics()
const initialize = async () => {
  const ticket = sync.checkpoint()
  await loadReferences()
  if (!sync.isCurrent(ticket)) return
  query.value.semesterId = options.value?.currentSemesterId ?? undefined
  await load()
}
const sync = useExamSync({
  matches: (change) => relatesToExam(change, applied.value),
  busy: () => loading.value,
  reload: () => fetchStatistics({ ...applied.value }),
  reset: () => {
    revision++
    loading.value = false
    result.value = undefined
    options.value = undefined
    query.value = defaultQuery()
    applied.value = defaultQuery()
  }
})
onMounted(initialize)
</script>
