<template>
  <ScopeNotice
    :options="options"
    :loading="scopeLoading"
    :failed="scopeFailed"
    @retry="loadScope"
  />
  <el-tabs v-model="tab"
    ><el-tab-pane label="楼栋管理" name="building" /><el-tab-pane label="房间与床位" name="room"
  /></el-tabs>
  <ResourceList :key="tab" :kind="tab" />
</template>
<script setup lang="ts">
import { useDormReferences } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import ResourceList from './ResourceList.vue'
defineOptions({ name: 'DormResource' })
const tab = ref<'building' | 'room'>('building')
const { options, loading: scopeLoading, failed: scopeFailed, load: loadScope } = useDormReferences()
</script>
