<template>
  <el-select
    v-model="model"
    remote
    filterable
    clearable
    :remote-method="search"
    :loading="loading"
    :disabled="!can('session:query')"
    placeholder="搜索考试名称"
    class="!w-240px"
    @visible-change="visible"
    @change="selectedChanged"
  >
    <el-option
      v-for="s in displayRows"
      :key="s.id"
      :value="s.id"
      :label="s.name + ' · ' + s.startTime"
      :disabled="missing && String(s.id) === String(model)"
    />
    <template #footer>
      <div v-if="missing" class="text-12px text-[var(--el-color-warning)]"
        >所选考试已删除或不可访问，请手动重新选择</div
      >
      <el-button v-if="rows.length < total" link :loading="loading" @click.stop="more"
        >加载更多考试</el-button
      >
      <span v-else class="text-12px">{{ total }} 场考试</span>
    </template>
  </el-select>
</template>
<script setup lang="ts">
import { getSessionPage } from '@/api/exam'
import { useExamSync } from '../useExamSync'
import type { ExamId, ExamQuery, Session } from '@/api/exam/types'
import { can, key } from '../useExam'

const model = defineModel<ExamId>()
const props = defineProps<{ query: ExamQuery }>()
const rows = ref<Session[]>([])
const selected = ref<Session>()
const missing = ref(false)
const displayRows = computed(() =>
  selected.value && !rows.value.some((s) => key(s.id) === key(selected.value?.id))
    ? [selected.value, ...rows.value]
    : rows.value
)
const selectedChanged = (id?: ExamId) => {
  selected.value = displayRows.value.find((s) => key(s.id) === key(id))
  missing.value = false
}
const total = ref(0)
const loading = ref(false)
let page = 1
let name = ''
let revision = 0
const load = async () => {
  if (!can('session:query')) return
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  const selectedId = model.value
  const requestedPage = page
  loading.value = true
  try {
    const [data, selection] = await Promise.all([
      getSessionPage({
        ...props.query,
        sessionId: undefined,
        pageNo: requestedPage,
        pageSize: 50,
        name
      }),
      selectedId
        ? getSessionPage({ pageNo: 1, pageSize: 1, sessionId: selectedId })
        : Promise.resolve(undefined)
    ])
    if (current !== revision) return
    rows.value = requestedPage === 1 ? data.list : [...rows.value, ...data.list]
    total.value = data.total
    if (key(model.value) === key(selectedId) && selectedId) {
      missing.value = !selection?.list.length
      if (selection?.list[0]) selected.value = selection.list[0]
      else {
        selected.value = {
          ...(selected.value ?? {}),
          id: selectedId,
          name: selected.value?.name ?? '所选考试',
          startTime: ''
        } as Session
        rows.value = rows.value.filter((s) => key(s.id) !== key(selectedId))
      }
    }
    sync.settled(ticket)
  } catch {
    if (current === revision) {
      if (requestedPage === 1) {
        rows.value = []
        total.value = 0
      }
      page = Math.max(1, requestedPage - 1)
    }
  } finally {
    if (current === revision) loading.value = false
  }
}
const search = (value: string) => {
  name = value
  page = 1
  void load()
}
const more = () => {
  if (!loading.value) {
    page++
    void load()
  }
}
const visible = (show: boolean) => {
  if (show) search('')
}
watch(
  () => [
    props.query.semesterId,
    props.query.courseId,
    props.query.classId,
    props.query.startDate,
    props.query.endDate
  ],
  () => {
    revision++
    rows.value = []
    total.value = 0
    loading.value = false
  }
)
watch(model, (id) => {
  if (!id) {
    selected.value = undefined
    missing.value = false
  }
})
const sync = useExamSync({
  matches: (change) => change.type === 'session',
  busy: () => loading.value,
  enabled: () => can('session:query'),
  reload: async () => {
    page = 1
    await load()
  },
  reset: () => {
    revision++
    rows.value = []
    selected.value = undefined
    missing.value = false
    total.value = 0
    loading.value = false
    model.value = undefined
  }
})
</script>
