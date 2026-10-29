<template>
  <el-alert
    v-if="failed"
    title="数据加载失败或无查询权限，当前列表不可作为最新结果。"
    type="error"
    :closable="false"
    class="mb-15px"
  >
    <el-button link type="primary" @click="$emit('retry')">重试</el-button>
  </el-alert>
</template>
<script setup lang="ts">
defineProps<{ failed: boolean }>()
defineEmits<{ retry: [] }>()
</script>
