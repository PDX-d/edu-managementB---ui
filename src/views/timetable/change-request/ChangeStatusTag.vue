<template>
  <el-tag :type="option?.tagType || 'info'">{{ option?.label || status }}</el-tag>
</template>
<script lang="ts" setup>
import { CHANGE_STATUS_OPTIONS } from '../utils'

defineOptions({ name: 'TimetableChangeStatusTag' })

const props = defineProps<{ status: number }>()
const option = computed(() => CHANGE_STATUS_OPTIONS.find((item) => item.value === props.status))
</script>
