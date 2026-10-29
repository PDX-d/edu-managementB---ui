<template>
  <ContentWrap>
    <el-alert
      title="仅录入当日实际已入住学生；未录入不等于缺勤。不在寝须填原因并通知辅导员。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <el-form
      :model="params"
      :inline="true"
      :disabled="saving"
      label-width="68px"
      class="-mb-15px"
      @submit.prevent="search"
    >
      <el-form-item label="学生"
        ><el-input
          v-model="params.keyword"
          clearable
          maxlength="100"
          placeholder="学号 / 姓名"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="班级"
        ><el-select v-model="params.classId" clearable class="!w-240px"
          ><el-option
            v-for="(name, id) in classes"
            :key="id"
            :value="id"
            :label="name" /></el-select
      ></el-form-item>
      <el-form-item label="房间"
        ><DormPicker v-model="params.roomId" kind="room" class="!w-240px"
      /></el-form-item>
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button :loading="loading" @click="load()">刷新</el-button
        ><el-button
          v-if="can('night-check:update')"
          type="primary"
          plain
          :loading="saving"
          :disabled="!dirty || loading || failed"
          @click="save"
          >保存当前页修改</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load()" />
    <el-table v-loading="loading || saving" :data="rows">
      <el-table-column prop="checkDate" label="查寝日期" width="120" /><el-table-column
        prop="studentNo"
        label="学号"
        min-width="140"
      /><el-table-column prop="studentName" label="学生" width="110" /><el-table-column
        prop="className"
        label="班级"
        min-width="140"
        show-overflow-tooltip
      /><el-table-column prop="bedLabel" label="当前床位" min-width="200" show-overflow-tooltip />
      <el-table-column label="查寝结果" width="160"
        ><template #default="{ row }"
          ><el-select
            v-model="row.status"
            placeholder="未录入"
            :disabled="saving || !can('night-check:update')"
            ><el-option label="在寝" value="PRESENT" /><el-option
              label="不在寝"
              value="ABSENT" /></el-select></template
      ></el-table-column>
      <el-table-column label="原因（不在寝必填）" min-width="220"
        ><template #default="{ row }"
          ><el-input
            v-model="row.reason"
            maxlength="500"
            :disabled="saving || !can('night-check:update')" /></template
      ></el-table-column>
    </el-table>
    <Pagination
      v-model:page="params.pageNo"
      v-model:limit="params.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      @pagination="load()"
    />
  </ContentWrap>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as Api from '@/api/dorm'
import { dormContext } from '@/api/dorm/context'
import type { NightSave } from '@/api/dorm/types'
import { can, key, query, confirmDiscard, useScopeReset, useUnsavedGuard } from '../useDorm'
import DormPicker from '../components/DormPicker.vue'
import ListState from '../components/ListState.vue'
defineProps<{ classes?: Record<string, string> }>()
interface Row extends NightSave {
  studentNo: string
  studentName: string
  className: string
  bedLabel: string
  checkDate: string
}
const params = reactive(query())
const rows = ref<Row[]>([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const failed = ref(false)
const baseline = ref('[]')
const dirty = computed(() => JSON.stringify(rows.value) !== baseline.value)
let applied = { ...params }
let revision = 0
const allowLeave = () => (saving.value ? Promise.resolve(false) : confirmDiscard(dirty.value))
const load = async (ask = true) => {
  if (saving.value || (ask && !(await allowLeave()))) {
    Object.assign(params, applied)
    return
  }
  const rev = ++revision
  loading.value = true
  failed.value = false
  try {
    if (!can('night-check:query')) throw new Error('无查询权限')
    let result = await Api.roster({ ...params })
    const last = Math.max(1, Math.ceil(result.total / params.pageSize))
    if (params.pageNo > last && rev === revision) {
      params.pageNo = last
      result = await Api.roster({ ...params })
    }
    if (rev !== revision) return
    rows.value = result.list.map(({ stay, check, checkDate }) => ({
      studentNo: stay.studentNo,
      studentName: stay.studentName,
      className: stay.className,
      bedLabel: stay.bedLabel,
      stayId: stay.id,
      checkDate,
      id: check?.id,
      rowVersion: check?.rowVersion,
      status: check?.status ?? '',
      reason: check?.reason ?? ''
    }))
    baseline.value = JSON.stringify(rows.value)
    total.value = result.total
    applied = { ...params }
  } catch {
    if (rev === revision) {
      rows.value = []
      baseline.value = '[]'
      total.value = 0
      failed.value = true
    }
  } finally {
    if (rev === revision) loading.value = false
  }
}
const search = () => {
  params.pageNo = 1
  return load()
}
const save = async () => {
  if (saving.value || loading.value || failed.value || !can('night-check:update')) return
  const original = new Map(
    (JSON.parse(baseline.value) as Row[]).map((r) => [key(r.stayId), JSON.stringify(r)])
  )
  const changed = rows.value.filter((r) => JSON.stringify(r) !== original.get(key(r.stayId)))
  if (!changed.length) return
  if (changed.some((r) => !r.status || (r.status === 'ABSENT' && !r.reason?.trim()))) {
    ElMessage.warning('已修改行需选择结果，不在寝必须填写原因')
    return
  }
  const rev = revision
  const context = dormContext()
  saving.value = true
  try {
    await Api.saveNights(
      changed.map((r) => ({
        id: r.id,
        rowVersion: r.rowVersion,
        stayId: r.stayId,
        checkDate: r.checkDate,
        status: r.status,
        reason: r.reason?.trim()
      })),
      changed[0].checkDate
    )
    if (rev !== revision || context !== dormContext()) return
    baseline.value = JSON.stringify(rows.value)
    ElMessage.success('保存成功')
    saving.value = false
    await load(false)
  } catch {
    return
  } finally {
    if (rev === revision) saving.value = false
  }
}
useUnsavedGuard(dirty, saving)
useScopeReset(() => {
  revision++
  rows.value = []
  baseline.value = '[]'
  total.value = 0
  loading.value = false
  saving.value = false
  failed.value = true
})
onBeforeUnmount(() => revision++)
onMounted(() => load(false))
defineExpose({ allowLeave })
</script>
