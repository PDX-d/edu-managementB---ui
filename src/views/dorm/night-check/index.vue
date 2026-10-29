<template>
  <ScopeNotice
    :options="options"
    :loading="scopeLoading"
    :failed="scopeFailed"
    @retry="loadScope"
  />
  <el-tabs v-model="tab" :before-leave="beforeLeave"
    ><el-tab-pane label="查寝历史" name="history" /><el-tab-pane
      v-if="staff"
      label="当日查寝录入"
      name="roster"
  /></el-tabs>
  <RosterEditor
    v-if="tab === 'roster' && staff"
    ref="rosterRef"
    :classes="options?.classes"
  /><NightHistory v-else :staff="staff" />
</template>
<script setup lang="ts">
import { useDormReferences } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import NightHistory from './NightHistory.vue'
import RosterEditor from './RosterEditor.vue'
defineOptions({ name: 'DormNightCheck' })
const tab = ref('history')
const rosterRef = ref<InstanceType<typeof RosterEditor>>()
const {
  options,
  loading: scopeLoading,
  failed: scopeFailed,
  load: loadScope,
  staff
} = useDormReferences()
const beforeLeave = () => (tab.value === 'roster' ? (rosterRef.value?.allowLeave() ?? true) : true)
</script>
