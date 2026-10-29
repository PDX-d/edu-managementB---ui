<template>
  <el-select
    ref="selectRef"
    v-model="value"
    :loading="loading"
    :disabled="disabled || !allowed"
    filterable
    :remote="searchable"
    :remote-method="search"
    clearable
    :placeholder="allowed ? placeholder : '无选项查询权限'"
  >
    <el-option
      v-for="option in shownOptions"
      :key="key(option.id)"
      :label="option.label"
      :value="option.id"
      :disabled="option.disabled"
    />
    <template #empty>{{ loading ? '加载中' : failed ? '加载失败' : '暂无数据' }}</template>
    <template #footer>
      <span v-if="failed" class="text-red-500">加载失败</span>
      <el-button v-if="failed" link type="primary" @click="load(failedReset)">重试</el-button>
      <el-button v-else-if="hasMore" link type="primary" :loading="loading" @click="load(false)"
        >加载更多</el-button
      >
      <span v-else class="text-12px text-gray-500">{{
        kind === 'bed' ? '仅显示可分配空床；可按楼栋/房间筛选' : '选项按权限过滤'
      }}</span>
    </template>
  </el-select>
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import type { SelectInstance } from 'element-plus'
import { dormContext } from '@/api/dorm/context'
import type { Id, Query } from '@/api/dorm/types'
import { can, key, label, useScopeReset } from '../useDorm'
type Kind = 'student' | 'building' | 'room' | 'bed' | 'stay'
interface Option {
  id: Id
  label: string
  disabled?: boolean
}
const props = withDefaults(
  defineProps<{
    modelValue?: Id
    kind: Kind
    params?: Partial<Query>
    disabled?: boolean
    selectedLabel?: string
    placeholder?: string
    occupiedOnly?: boolean
  }>(),
  { placeholder: '请选择', selectedLabel: '' }
)
const emit = defineEmits<{ 'update:modelValue': [Id | undefined]; picked: [Option | undefined] }>()
const value = computed({
  get: () => props.modelValue,
  set: (v) => {
    emit('update:modelValue', v)
    emit(
      'picked',
      shownOptions.value.find((o) => key(o.id) === key(v))
    )
  }
})
const rows = ref<Option[]>([])
const selectRef = ref<SelectInstance>()
const retained = ref<Option[]>([])
const loading = ref(false)
const failed = ref(false)
const page = ref(1)
const total = ref(0)
const keyword = ref('')
let revision = 0
let pendingKey = ''
let loadedCriteria = ''
const failedReset = ref(true)
const permission = computed(
  () =>
    ({
      student: 'reference:query',
      building: 'building:query',
      room: 'room:query',
      bed: 'bed:query',
      stay: 'stay:query'
    })[props.kind]
)
const allowed = computed(() => can(permission.value))
const searchable = computed(() => props.kind !== 'bed')
const ids = computed(() => (props.modelValue == null ? [] : [props.modelValue]))
const shownOptions = computed(() => {
  const merged = new Map([...retained.value, ...rows.value].map((o) => [key(o.id), o]))
  ids.value.forEach((id) => {
    if (!merged.has(key(id)))
      merged.set(key(id), {
        id,
        label: props.selectedLabel || `原选项 ${id}（不在当前可选范围）`,
        disabled: true
      })
  })
  return [...merged.values()]
})
const hasMore = computed(() => page.value * 50 < total.value)
const load = async (reset: boolean) => {
  if (!allowed.value || !selectRef.value?.expanded || (!reset && (loading.value || !hasMore.value)))
    return
  const next = reset ? 1 : page.value + 1
  const q: Query = {
    ...props.params,
    pageNo: next,
    pageSize: 50,
    keyword: searchable.value ? keyword.value : undefined
  }
  const context = dormContext()
  const criteria = JSON.stringify([
    context,
    props.kind,
    Object.entries(q)
      .filter(([k, v]) => k !== 'pageNo' && v != null)
      .sort(([a], [b]) => a.localeCompare(b)),
    props.occupiedOnly
  ])
  const requestKey = `${criteria}:${next}`
  if (
    pendingKey === requestKey ||
    (reset && loadedCriteria === criteria && !loading.value && !failed.value)
  )
    return
  const rev = ++revision
  pendingKey = requestKey
  loading.value = true
  failed.value = false
  failedReset.value = reset
  try {
    let result: PageResult<Option[]>
    if (props.kind === 'student') {
      const r = await Api.students(q)
      result = {
        ...r,
        list: r.list.map((s) => ({
          id: s.id,
          label: `${s.studentNo} · ${s.name} · ${s.className}`,
          disabled: !s.enrolled
        }))
      }
    } else if (props.kind === 'building') {
      const r = await Api.buildings(q)
      result = {
        ...r,
        list: r.list.map((b) => ({
          id: b.id,
          label: `${b.name} · ${label(b.gender)}${b.status ? '（停用）' : ''}`,
          disabled: b.status !== 0
        }))
      }
    } else if (props.kind === 'room') {
      const r = await Api.rooms(q)
      result = {
        ...r,
        list: r.list.map((r) => ({
          id: r.id,
          label: `${r.buildingName} / ${r.roomNo}${r.status ? '（停用）' : ''}`
        }))
      }
    } else if (props.kind === 'bed') {
      const r = await Api.bedOptions(q)
      result = { ...r, list: r.list.map((b) => ({ id: b.id, label: b.bedLabel })) }
    } else {
      const r = await Api.stays(q)
      result = {
        ...r,
        list: r.list.map((s) => ({
          id: s.id,
          label: `${s.studentNo} · ${s.studentName} · ${s.bedLabel} · ${label(s.status)}`,
          disabled: props.occupiedOnly ? !s.checkInTime : false
        }))
      }
    }
    if (rev === revision && context === dormContext()) {
      rows.value = reset ? result.list : [...rows.value, ...result.list]
      page.value = next
      total.value = result.total
      loadedCriteria = criteria
    }
  } catch {
    if (rev === revision) {
      failed.value = true
      if (reset) {
        rows.value = []
        total.value = 0
        page.value = 1
        loadedCriteria = ''
      }
    }
  } finally {
    if (rev === revision) {
      loading.value = false
      pendingKey = ''
    }
  }
}
const search = (text: string) => {
  if (!selectRef.value?.expanded) return
  keyword.value = text
  void load(true)
}
const invalidate = () => {
  revision++
  pendingKey = ''
  loadedCriteria = ''
  loading.value = false
  failed.value = false
}
watch(
  () => selectRef.value?.expanded,
  (open) => {
    if (open) void load(true)
    else {
      invalidate()
      keyword.value = ''
    }
  },
  { flush: 'sync' }
)
watch(
  () => props.modelValue,
  () => {
    retained.value = shownOptions.value.filter((o) => ids.value.some((id) => key(id) === key(o.id)))
  },
  { deep: true }
)
watch(
  () =>
    JSON.stringify([
      props.kind,
      Object.entries(props.params ?? {})
        .filter(([, v]) => v != null)
        .sort(([a], [b]) => a.localeCompare(b)),
      props.occupiedOnly
    ]),
  () => {
    invalidate()
    rows.value = []
    retained.value = []
    total.value = 0
    if (selectRef.value?.expanded) void load(true)
  }
)
useScopeReset(() => {
  invalidate()
  keyword.value = ''
  rows.value = []
  retained.value = []
  total.value = 0
})
watch(allowed, (value) => {
  if (!value) {
    invalidate()
    rows.value = []
    retained.value = []
    total.value = 0
  }
})
onBeforeUnmount(invalidate)
</script>
