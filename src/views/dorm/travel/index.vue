<template>
  <ScopeNotice
    :options="options"
    :loading="scopeLoading"
    :failed="scopeFailed"
    @retry="loadScope"
  />
  <el-tabs v-model="tab"
    ><el-tab-pane label="离返校记录" name="records" /><el-tab-pane
      v-if="staff"
      label="班级汇总"
      name="summary"
  /></el-tabs>
  <TripList v-if="tab === 'records'" :staff="staff" :classes="options?.classes" /><TravelSummary
    v-else-if="staff"
    :classes="options?.classes"
  />
</template>
<script setup lang="ts">
import { useDormReferences } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import TripList from './TripList.vue'
import TravelSummary from './TravelSummary.vue'
defineOptions({ name: 'DormTravel' })
const tab = ref('records')
const {
  options,
  loading: scopeLoading,
  failed: scopeFailed,
  load: loadScope,
  staff
} = useDormReferences()
</script>
