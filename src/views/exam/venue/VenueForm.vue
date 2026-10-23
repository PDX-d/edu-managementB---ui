<template>
  <Dialog
    v-model="visible"
    :title="readonly ? '考场详情' : form.id ? '编辑考场' : '新增考场'"
    width="640px"
  >
    <SyncNotice :stale="sync.stale.value" :dirty="dirty" :busy="loading" @refresh="sync.refresh" />
    <el-alert
      title="坐标采用 WGS84（浏览器定位坐标），不要直接使用高德 / 百度偏移坐标。修改考场不会改变已有考试的场地快照。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="115px"
      :disabled="readonly || loading || !ready"
    >
      <el-form-item label="考场名称" prop="name"
        ><el-input v-model="form.name" maxlength="100"
      /></el-form-item>
      <el-form-item label="地址" prop="address"
        ><el-input v-model="form.address" maxlength="255"
      /></el-form-item>
      <el-form-item label="容量" prop="capacity"
        ><el-input-number v-model="form.capacity" :min="1" :max="2147483647" :precision="0"
      /></el-form-item>
      <el-form-item label="经度" prop="longitude"
        ><el-input-number
          v-model="form.longitude"
          :min="-180"
          :max="180"
          :precision="7"
          :step="0.0001"
          class="!w-240px"
      /></el-form-item>
      <el-form-item label="纬度" prop="latitude"
        ><el-input-number
          v-model="form.latitude"
          :min="-90"
          :max="90"
          :precision="7"
          :step="0.0001"
          class="!w-240px"
      /></el-form-item>
      <el-form-item label="签到半径（米）" prop="radiusMeters"
        ><el-input-number v-model="form.radiusMeters" :min="0.01" :max="10000" :precision="2"
      /></el-form-item>
      <el-form-item label="状态"
        ><el-radio-group v-model="form.status"
          ><el-radio :value="0">启用</el-radio><el-radio :value="1">停用</el-radio></el-radio-group
        ></el-form-item
      >
    </el-form>
    <template #footer>
      <el-button
        v-if="!readonly"
        type="primary"
        :disabled="!ready"
        :loading="loading"
        @click="submit"
        >确 定</el-button
      >
      <el-button @click="visible = false">{{ readonly ? '关 闭' : '取 消' }}</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import * as api from '@/api/exam'
import type { ExamId, VenueSave } from '@/api/exam/types'
import { can } from '../useExam'
import SyncNotice from '../components/SyncNotice.vue'
import { useExamSync } from '../useExamSync'

const visible = ref(false)
const readonly = ref(false)
const loading = ref(false)
const ready = ref(false)
let revision = 0
const isCurrent = (current: number) => visible.value && current === revision
watch(
  visible,
  (value) => {
    if (!value) {
      revision++
      ready.value = false
      loading.value = false
    }
  },
  { flush: 'sync' }
)
onBeforeUnmount(() => {
  revision++
})
const formRef = ref<FormInstance>()
type VenueFormData = Omit<VenueSave, 'latitude' | 'longitude'> & {
  latitude?: number
  longitude?: number
}
const empty = (): VenueFormData => ({
  name: '',
  address: '',
  capacity: 1,
  longitude: undefined,
  latitude: undefined,
  radiusMeters: 100,
  status: 0
})
const form = ref<VenueFormData>(empty())
const baseline = ref('')
const dirty = computed(
  () => ready.value && !readonly.value && JSON.stringify(form.value) !== baseline.value
)
const message = useMessage()
const emit = defineEmits(['success'])
const rules: FormRules = Object.fromEntries(
  ['name', 'address', 'capacity', 'longitude', 'latitude', 'radiusMeters'].map((field) => [
    field,
    [{ required: true, message: '此项不能为空', trigger: 'blur' }]
  ])
)
const open = async (id?: ExamId, detail = false) => {
  if (!detail && !can(id ? 'venue:update' : 'venue:create')) return
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  visible.value = true
  readonly.value = detail
  ready.value = false
  loading.value = true
  form.value = empty()
  formRef.value?.clearValidate()
  try {
    if (id) {
      const data = await api.getVenue(id)
      if (!isCurrent(current)) return
      form.value = { ...data }
    }
    baseline.value = JSON.stringify(form.value)
    ready.value = true
    sync.settled(ticket)
  } finally {
    if (isCurrent(current)) loading.value = false
  }
}
const submit = async () => {
  if (
    readonly.value ||
    !ready.value ||
    loading.value ||
    !can(form.value.id ? 'venue:update' : 'venue:create')
  )
    return
  const current = revision
  if (!(await formRef.value?.validate().catch(() => false))) return
  if (!isCurrent(current)) return
  const { latitude, longitude } = form.value
  if (typeof latitude !== 'number' || typeof longitude !== 'number')
    return message.warning('请填写考场的真实 WGS84 经纬度')
  loading.value = true
  try {
    await api.saveVenue({
      ...form.value,
      latitude,
      longitude,
      name: form.value.name.trim(),
      address: form.value.address.trim()
    })
    emit('success')
    if (!isCurrent(current)) return
    message.success('保存成功')
    visible.value = false
  } finally {
    if (isCurrent(current)) loading.value = false
  }
}
const sync = useExamSync({
  matches: (change) =>
    change.type === 'venue' && !!form.value.id && String(change.venueId) === String(form.value.id),
  dirty: () => dirty.value,
  busy: () => loading.value,
  enabled: () => visible.value,
  reload: () => open(form.value.id, readonly.value),
  reset: () => {
    visible.value = false
    revision++
    form.value = empty()
  }
})
defineExpose({ open })
</script>
