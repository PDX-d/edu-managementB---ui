<template>
  <el-alert
    v-if="stale"
    title="数据已更新，当前输入不会被自动覆盖。"
    type="warning"
    :closable="false"
    class="mb-15px"
  >
    <el-button link type="primary" :disabled="busy" @click="$emit('refresh')">{{
      dirty ? '放弃修改并刷新' : '刷新最新数据'
    }}</el-button>
  </el-alert>
</template>
<script setup lang="ts">
defineProps<{ stale: boolean; dirty?: boolean; busy?: boolean }>()
defineEmits(['refresh'])
</script>
