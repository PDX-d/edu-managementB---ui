<template>
  <ScopeNotice
    :options="options"
    :loading="scopeLoading"
    :failed="scopeFailed"
    @retry="loadScope"
  />
  <el-tabs v-model="tab"
    ><el-tab-pane label="卫生评分" name="records" /><el-tab-pane label="周 / 月排名" name="ranking"
  /></el-tabs>
  <HygieneList v-if="tab === 'records'" :staff="staff" /><HygieneRanking v-else />
</template>
<script setup lang="ts">
import { useDormReferences } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import HygieneList from './HygieneList.vue'
import HygieneRanking from './HygieneRanking.vue'
defineOptions({ name: 'DormHygiene' })
const tab = ref('records')
const {
  options,
  loading: scopeLoading,
  failed: scopeFailed,
  load: loadScope,
  staff
} = useDormReferences()
</script>
