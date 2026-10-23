<template>
  <Dialog v-model="visible" title="成绩分项配置" width="650px">
    <SyncNotice :stale="sync.stale.value" :dirty="dirty" :busy="loading" @refresh="sync.refresh" />
    <el-alert
      title="权重合计须为 100%。首次完整录分后分项和权重锁定，归档学期只读。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <div v-loading="loading"
      ><ScoreItems
        v-model="items"
        :readonly="!session || session.archived || session.scoreConfigLocked || loading"
    /></div>
    <template #footer
      ><el-button
        type="primary"
        :loading="loading"
        :disabled="!session || session.archived || session.scoreConfigLocked"
        @click="submit"
        >确 定</el-button
      ><el-button @click="visible = false">取 消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import * as api from '@/api/exam'
import type { ExamId, ScoreItem, Session } from '@/api/exam/types'
import { can, validateItems } from '../useExam'
import ScoreItems from '../components/ScoreItems.vue'
import SyncNotice from '../components/SyncNotice.vue'
import { useExamSync } from '../useExamSync'
const visible = ref(false)
const loading = ref(false)
const session = ref<Session>()
const items = ref<ScoreItem[]>([])
const baseline = ref('')
const dirty = computed(() => !!session.value && JSON.stringify(items.value) !== baseline.value)
let revision = 0
watch(
  visible,
  (show) => {
    if (!show) {
      revision++
      loading.value = false
    }
  },
  { flush: 'sync' }
)
const message = useMessage()
const emit = defineEmits(['success'])
const open = async (id: ExamId) => {
  if (!can('score:config') || !can('session:query')) return
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  visible.value = true
  session.value = undefined
  items.value = []
  loading.value = true
  try {
    const data = await api.getSession(id)
    if (current !== revision || !visible.value) return
    session.value = data
    items.value = session.value.scoreItems.map((item) => ({ ...item }))
    baseline.value = JSON.stringify(items.value)
    sync.settled(ticket)
  } finally {
    if (current === revision) loading.value = false
  }
}
const submit = async () => {
  if (
    loading.value ||
    !session.value ||
    session.value.archived ||
    session.value.scoreConfigLocked ||
    !can('score:config')
  )
    return
  const error = validateItems(items.value)
  if (error) return message.warning(error)
  loading.value = true
  const current = revision
  try {
    await api.saveScoreConfig(
      session.value.id,
      session.value.sessionVersion,
      items.value.map((item, sort) => ({ ...item, name: item.name.trim(), sort }))
    )
    if (current !== revision || !visible.value) return
    message.success('分项配置已保存')
    visible.value = false
    emit('success')
  } finally {
    if (current === revision) loading.value = false
  }
}
const sync = useExamSync({
  matches: (change) =>
    change.type !== 'venue' && String(change.sessionId) === String(session.value?.id),
  dirty: () => dirty.value,
  busy: () => loading.value,
  enabled: () => visible.value && !!session.value,
  reload: () => open(session.value!.id),
  reset: () => {
    visible.value = false
    revision++
    session.value = undefined
    items.value = []
  }
})
defineExpose({ open })
</script>
