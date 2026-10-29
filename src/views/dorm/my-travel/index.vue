<template>
  <ScopeNotice
    :options="options"
    :loading="scopeLoading"
    :failed="scopeFailed"
    @retry="loadScope"
  />
  <ContentWrap v-if="student">
    <ListState :failed="failed" @retry="loadContext" />
    <el-descriptions v-loading="loading" :column="2" border
      ><el-descriptions-item label="本人出行状态"
        ><el-tag :type="context?.activeTrip ? 'warning' : 'info'">{{
          failed || !context ? '状态不可用' : context.activeTrip ? '在外' : '无未返校记录'
        }}</el-tag></el-descriptions-item
      ><el-descriptions-item label="最近校准服务器时间">{{
        formatBizTime(context?.serverTime) || '—'
      }}</el-descriptions-item
      ><el-descriptions-item v-if="context?.activeTrip" label="离校时间">{{
        formatBizTime(context.activeTrip.departTime)
      }}</el-descriptions-item
      ><el-descriptions-item v-if="context?.activeTrip" label="离校审核">{{
        label(context.activeTrip.reviewStatus)
      }}</el-descriptions-item></el-descriptions
    >
    <div class="mt-15px flex gap-10px"
      ><el-button :loading="loading" @click="loadContext"
        ><Icon icon="ep:refresh" class="mr-5px" />刷新状态</el-button
      ><el-button
        v-if="student && can('travel:check-in')"
        type="primary"
        :disabled="loading || failed || !context"
        @click="punchRef?.open(context?.activeTrip?.id)"
        >{{ context?.activeTrip ? '本人返校打卡' : '本人离校打卡' }}</el-button
      ></div
    >
    <el-alert
      title="不自动采集位置或照片；点击打卡并确认授权后才获取。审核拒绝不阻止返校。"
      type="info"
      :closable="false"
      class="mt-15px"
    />
  </ContentWrap>
  <el-empty
    v-else-if="!scopeLoading && options"
    description="本页面仅供已绑定学生业务身份的本人账号使用"
  />
  <TripList v-if="student" ref="listRef" mine /><PunchForm ref="punchRef" @success="refresh" />
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import type { TravelContext } from '@/api/dorm/types'
import { can, formatBizTime, label, useDormReferences, useScopeReset } from '../useDorm'
import ScopeNotice from '../components/ScopeNotice.vue'
import ListState from '../components/ListState.vue'
import TripList from '../travel/TripList.vue'
import PunchForm from './PunchForm.vue'
defineOptions({ name: 'DormMyTravel' })
const {
  options,
  loading: scopeLoading,
  failed: scopeFailed,
  load: loadScope,
  student
} = useDormReferences()
const context = ref<TravelContext>()
const loading = ref(false)
const failed = ref(false)
const listRef = ref<InstanceType<typeof TripList>>()
const punchRef = ref<InstanceType<typeof PunchForm>>()
let revision = 0
const loadContext = async () => {
  if (!student.value) return
  const rev = ++revision
  loading.value = true
  failed.value = false
  try {
    if (!can('travel:check-in')) throw new Error('无打卡权限')
    const result = await Api.travelContext()
    if (rev === revision) context.value = result
  } catch {
    if (rev === revision) {
      context.value = undefined
      failed.value = true
    }
  } finally {
    if (rev === revision) loading.value = false
  }
}
const refresh = () => {
  void loadContext()
  void listRef.value?.load()
}
useScopeReset(() => {
  revision++
  context.value = undefined
  loading.value = false
  failed.value = true
})
onBeforeUnmount(() => revision++)
watch(student, (value) => {
  if (value) void loadContext()
})
</script>
