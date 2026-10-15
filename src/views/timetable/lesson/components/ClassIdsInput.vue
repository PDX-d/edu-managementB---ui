<template>
  <el-select
    :model-value="modelValue"
    multiple
    filterable
    allow-create
    default-first-option
    :reserve-keyword="false"
    placeholder="输入班级 ID 后回车，可输入多个（合班）"
    class="!w-full"
    @update:model-value="handleChange"
  >
    <el-option v-for="id in modelValue" :key="id" :label="optionLabel(id)" :value="id" />
  </el-select>
  <div class="text-12px text-[var(--el-text-color-secondary)] leading-20px">
    班级 ID 为班级管理模块中的真实业务 ID，支持逗号或空格分隔批量输入，最多 {{ MAX_CLASS_COUNT }} 个
  </div>
</template>
<script lang="ts" setup>
import { idKey, isPositiveId, uniqueIds } from '../../utils'

defineOptions({ name: 'TimetableClassIdsInput' })

const MAX_CLASS_COUNT = 100

const props = defineProps<{
  modelValue: string[]
  labels?: Record<string, string> // 班级 ID → 后端返回的班级名称（编辑时展示用）
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()
const message = useMessage()

const optionLabel = (id: string) => {
  const name = props.labels?.[id]
  return name ? `${name}（${id}）` : id
}

/** 拆分、校验、去重并限制数量 */
const handleChange = (values: string[]) => {
  const parts = values.flatMap((value) => String(value).split(/[\s,，、]+/)).map((v) => idKey(v))
  const invalid = parts.filter((v) => v && !isPositiveId(v))
  if (invalid.length) {
    message.warning(`已忽略无效的班级 ID：${invalid.join('、')}`)
  }
  let ids = uniqueIds(parts.filter((v) => isPositiveId(v)))
  if (ids.length > MAX_CLASS_COUNT) {
    message.warning(`班级最多 ${MAX_CLASS_COUNT} 个`)
    ids = ids.slice(0, MAX_CLASS_COUNT)
  }
  emit('update:modelValue', ids)
}
</script>
