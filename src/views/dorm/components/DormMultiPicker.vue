<template>
  <div class="w-full">
    <DormPicker
      v-model="pending"
      :kind="kind"
      :disabled="disabled || modelValue.length >= limit"
      placeholder="选择后加入下方名单"
      @picked="add"
    />
    <div class="mt-8px flex flex-wrap gap-8px"
      ><el-tag v-for="id in modelValue" :key="key(id)" :closable="!disabled" @close="remove(id)">{{
        names[key(id)] || id
      }}</el-tag></div
    >
    <div class="mt-8px text-12px text-gray-500">已选 {{ modelValue.length }} / {{ limit }}</div>
  </div>
</template>
<script setup lang="ts">
import type { Id } from '@/api/dorm/types'
import { key } from '../useDorm'
import DormPicker from './DormPicker.vue'
const props = withDefaults(
  defineProps<{
    modelValue: Id[]
    kind: 'student' | 'building'
    disabled?: boolean
    limit: number
  }>(),
  { disabled: false }
)
const emit = defineEmits<{ 'update:modelValue': [Id[]] }>()
const pending = ref<Id>()
const names = reactive<Record<string, string>>({})
const add = (item?: { id: Id; label: string }) => {
  if (!item || props.disabled || props.modelValue.length >= props.limit) return
  names[key(item.id)] = item.label
  if (!props.modelValue.some((id) => key(id) === key(item.id)))
    emit('update:modelValue', [...props.modelValue, item.id])
  nextTick(() => {
    pending.value = undefined
  })
}
const remove = (id: Id) => {
  if (!props.disabled)
    emit(
      'update:modelValue',
      props.modelValue.filter((v) => key(v) !== key(id))
    )
}
</script>
