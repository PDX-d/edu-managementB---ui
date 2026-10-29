<template>
  <el-alert
    v-if="failed"
    title="公共数据加载失败或无查询权限，请检查身份绑定、公共适配器及授权；不会使用模拟名单兜底。"
    type="error"
    :closable="false"
    class="mb-15px"
  >
    <el-button link type="primary" @click="$emit('retry')">重新加载</el-button>
  </el-alert>
  <el-alert
    v-else-if="loading"
    title="正在加载业务身份和班级选项…"
    type="info"
    :closable="false"
    class="mb-15px"
  />
  <div v-else-if="options" class="mb-15px flex items-center gap-10px">
    <el-tag v-if="options.mock" type="warning">本地模拟公共数据</el-tag>
    <el-tag type="info">{{ label(options.actorType) }} · 仅显示授权范围</el-tag>
  </div>
</template>
<script setup lang="ts">
import type { References } from '@/api/dorm/types'
import { label } from '../useDorm'
defineProps<{ options?: References; loading: boolean; failed: boolean }>()
defineEmits<{ retry: [] }>()
</script>
