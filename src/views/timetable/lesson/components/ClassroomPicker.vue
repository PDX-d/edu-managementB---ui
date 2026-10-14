<template>
  <el-select
    :model-value="modelValue || undefined"
    :loading="loading"
    :disabled="!canQuery"
    filterable
    clearable
    :placeholder="canQuery ? '请选择教室' : '无教室查询权限'"
    class="!w-full"
    @update:model-value="(value) => emit('update:modelValue', value ? idKey(value) : '')"
  >
    <el-option
      v-for="item in options"
      :key="item.value"
      :label="item.label"
      :value="item.value"
      :disabled="item.disabled"
    />
  </el-select>
  <div v-if="hint" class="text-12px leading-20px text-[var(--el-color-warning)]">{{ hint }}</div>
</template>
<script lang="ts" setup>
import { checkPermi } from '@/utils/permission'
import { getClassroomOptions } from '@/api/timetable/reference'
import type { ClassroomVO } from '@/api/timetable/classroom'
import { idKey } from '../../utils'

defineOptions({ name: 'TimetableClassroomPicker' })

const props = defineProps<{
  modelValue: string
  currentLabel?: string // 当前值不在启用列表中时（如已停用）的展示名称
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// simple-list 需要 timetable:classroom:query；无此权限（如学生、未授权教师）时不调用，也不允许手填教室 ID
const canQuery = checkPermi(['timetable:classroom:query'])
const loading = ref(false)
const failed = ref(false)
const classrooms = ref<ClassroomVO[]>([])

const options = computed(() => {
  const list = classrooms.value.map((item) => ({
    value: idKey(item.id),
    label: `${item.name}（${item.code}，容量 ${item.capacity}）`,
    disabled: false
  }))
  const current = idKey(props.modelValue)
  if (current && !list.some((item) => item.value === current)) {
    // 原教室不在启用列表（如已停用）：只展示原名称，不清空，是否可用以后端校验为准
    list.unshift({
      value: current,
      label: `${props.currentLabel || '教室 ' + current}${canQuery ? '（不在可选启用教室中）' : ''}`,
      disabled: true
    })
  }
  return list
})

const hint = computed(() => {
  if (!canQuery) return '当前账号没有教室查询权限，只能沿用原教室；如需选择教室请联系管理员授权'
  if (failed.value) return '教室列表加载失败，请稍后重试'
  return ''
})

const load = async () => {
  if (!canQuery) return
  loading.value = true
  failed.value = false
  try {
    classrooms.value = await getClassroomOptions()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ load })
</script>
