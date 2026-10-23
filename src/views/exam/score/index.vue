<template>
  <ContentWrap>
    <ExamFilter
      v-model="query"
      :options="options"
      :loading="referenceLoading"
      :failed="failed"
      with-session
      @reload="initialize"
      @search="search"
    >
      <el-form-item label="学号"
        ><el-input v-model="query.studentNo" clearable class="!w-240px" @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="姓名"
        ><el-input v-model="query.studentName" clearable class="!w-240px" @keyup.enter="search"
      /></el-form-item>
      <template #actions
        ><ExportButton :query="applied" :disabled="dirty || loading || saving"
      /></template>
    </ExamFilter>
  </ContentWrap>
  <ContentWrap>
    <SyncNotice
      :stale="sync.stale.value"
      :dirty="dirty"
      :busy="loading || saving"
      @refresh="sync.refresh"
    />
    <el-alert
      v-if="!can('session:query')"
      title="缺少考试查询权限，无法选择考试或加载分项；仍可按课程 / 班级查询成绩"
      type="warning"
      :closable="false"
      class="mb-15px"
    />
    <el-alert
      title="未录入不等于 0 分。仅提交本页已修改行，每行须填齐分项；最终成绩由后端计算。教师只读，辅导员仅可录入本人班级成绩。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <div class="mb-15px flex flex-wrap items-center gap-10px">
      <el-tag v-if="session">{{ session.name }}</el-tag>
      <el-tag v-if="session?.archived" type="info">归档学期，只读</el-tag>
      <el-tag v-if="dirty" type="warning">有未提交修改</el-tag>
      <el-button
        v-if="editable"
        type="primary"
        :loading="saving"
        :disabled="!dirty || loading"
        @click="save"
        ><Icon icon="ep:check" class="mr-5px" />保存本页修改</el-button
      >
      <el-button
        v-if="session && !session.archived"
        v-hasPermi="['exam:score:config']"
        :disabled="session.scoreConfigLocked || dirty || loading"
        @click="configRef?.open(session.id)"
        >分项配置</el-button
      >
      <el-button
        v-if="session && !session.archived"
        v-hasPermi="['exam:score:import']"
        :disabled="dirty || loading"
        @click="importRef?.open(session.id)"
        ><Icon icon="ep:upload" class="mr-5px" />导入成绩</el-button
      >
      <el-button :disabled="loading || saving" @click="load">刷新</el-button>
    </div>
    <el-table v-loading="loading" :data="rows" border>
      <el-table-column label="考试" prop="sessionName" min-width="160" show-overflow-tooltip />
      <el-table-column label="学号" prop="studentNo" min-width="130" />
      <el-table-column label="姓名" prop="studentName" min-width="100" />
      <el-table-column label="班级" prop="className" min-width="130" />
      <el-table-column
        v-for="item in session?.scoreItems || []"
        :key="key(item.id)"
        :label="`${item.name}（${item.weight}%）`"
        min-width="180"
      >
        <template #default="{ row }">
          <el-input-number
            v-if="editable"
            v-model="row.scores[key(item.id)]"
            :min="0"
            :max="100"
            :precision="2"
            :controls="false"
            :disabled="saving"
            placeholder="未录入"
            class="!w-140px"
          />
          <span v-else>{{ row.scores[key(item.id)] ?? '未录入' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="已保存总评" min-width="120"
        ><template #default="{ row }"
          ><el-tag
            v-if="row.finalScore != null"
            :type="Number(row.finalScore) >= 60 ? 'success' : 'danger'"
            >{{ row.finalScore }}</el-tag
          ><span v-else>未录入</span></template
        ></el-table-column
      >
      <el-table-column label="签到时间" min-width="180"
        ><template #default="{ row }">{{ row.signTime || '未签到' }}</template></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="load"
    />
  </ContentWrap>
  <ScoreConfig ref="configRef" @success="reloadSaved" />
  <ScoreImport ref="importRef" @success="reloadSaved" />
</template>
<script setup lang="ts">
import { onBeforeRouteLeave } from 'vue-router'
import * as api from '@/api/exam'
import type { ExamQuery, ScoreRow, ScoreSave, Session } from '@/api/exam/types'
import { can, defaultQuery, getExamPage, key, useExam } from '../useExam'
import ExamFilter from '../components/ExamFilter.vue'
import ExportButton from '../components/ExportButton.vue'
import ScoreConfig from './ScoreConfig.vue'
import ScoreImport from './ScoreImport.vue'
import SyncNotice from '../components/SyncNotice.vue'
import { useExamSync } from '../useExamSync'
import { relatesToExam, examContext } from '@/api/exam/sync'

defineOptions({ name: 'ExamScore' })
const { options, loading: referenceLoading, failed, load: loadReferences } = useExam()
const query = ref(defaultQuery())
const applied = ref<ExamQuery>(defaultQuery())
const rows = ref<ScoreRow[]>([])
const originals = ref<Record<string, string>>({})
const session = ref<Session>()
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const message = useMessage()
const configRef = ref<InstanceType<typeof ScoreConfig>>()
const importRef = ref<InstanceType<typeof ScoreImport>>()
const changed = computed(() =>
  rows.value.filter((r) => JSON.stringify(r.scores) !== originals.value[key(r.id)])
)
const dirty = computed(() => changed.value.length > 0)
const editable = computed(
  () => can('score:update') && !!session.value && !session.value.archived && !loading.value
)
let revision = 0
const discard = async () => {
  if (!dirty.value) return true
  try {
    await message.confirm('有未保存成绩，确认放弃修改？')
    return true
  } catch {
    return false
  }
}
const fetchRows = async (force = false, automatic = false) => {
  if (saving.value) return
  if (!force && !(await discard())) {
    query.value = { ...applied.value }
    return
  }
  const current = ++revision
  const params = { ...(automatic ? applied.value : query.value) }
  const ticket = sync.checkpoint()
  if (current !== revision) return
  loading.value = true
  rows.value = []
  originals.value = {}
  session.value = undefined
  try {
    const [result, detail] = await Promise.all([
      getExamPage(params, api.getScorePage),
      params.sessionId && can('session:query')
        ? api
            .getSessionPage({ pageNo: 1, pageSize: 1, sessionId: params.sessionId })
            .then((result) => result.list[0])
        : Promise.resolve(undefined)
    ])
    if (current !== revision) return
    rows.value = result.list.map((r) => ({ ...r, scores: { ...(r.scores || {}) } }))
    originals.value = Object.fromEntries(
      rows.value.map((r) => [key(r.id), JSON.stringify(r.scores)])
    )
    total.value = result.total
    query.value.pageNo = params.pageNo
    session.value = detail
    applied.value = params
    sync.settled(ticket)
  } catch {
    if (current === revision) total.value = 0
  } finally {
    if (current === revision) loading.value = false
  }
}
const load = () => fetchRows()
const search = () => {
  query.value.pageNo = 1
  void load()
}
const initialize = async () => {
  if (!(await discard())) return
  const ticket = sync.checkpoint()
  await loadReferences()
  if (!sync.isCurrent(ticket)) return
  query.value.semesterId = options.value?.currentSemesterId ?? undefined
  await fetchRows(true)
}
const reloadSaved = async () => {
  query.value = { ...applied.value }
  await fetchRows(true)
}
const save = async () => {
  if (!session.value || !editable.value || saving.value || !dirty.value) return
  const detail = session.value
  const batch: ScoreSave['rows'] = []
  for (const row of changed.value) {
    const scores: Record<string, number> = {}
    for (const item of detail.scoreItems) {
      const value = row.scores[key(item.id)]
      if (
        value == null ||
        !Number.isFinite(Number(value)) ||
        Number(value) < 0 ||
        Number(value) > 100
      )
        return message.warning(`${row.studentName} 的${item.name}须填写 0～100 的成绩`)
      scores[key(item.id)] = Number(value)
    }
    batch.push({ participantId: row.id, rowVersion: row.rowVersion, scores })
  }
  saving.value = true
  const context = examContext()
  let success = false
  try {
    await api.saveScores({
      sessionId: detail.id,
      sessionVersion: detail.sessionVersion,
      rows: batch
    })
    message.success('成绩已保存')
    success = true
  } finally {
    if (context.stamp === examContext().stamp) saving.value = false
  }
  if (success) await reloadSaved()
}
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
const sync = useExamSync({
  matches: (change) => relatesToExam(change, applied.value),
  dirty: () => dirty.value,
  busy: () => loading.value || saving.value,
  enabled: () => can('score:query'),
  reload: () => fetchRows(true, true),
  reset: () => {
    revision++
    rows.value = []
    originals.value = {}
    session.value = undefined
    options.value = undefined
    total.value = 0
    loading.value = false
    saving.value = false
    query.value = defaultQuery()
    applied.value = defaultQuery()
  }
})
onBeforeRouteLeave(discard)
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  void initialize()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>
