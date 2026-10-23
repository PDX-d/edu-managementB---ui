<template>
  <el-table :data="model" border>
    <el-table-column label="成绩分项" min-width="140">
      <template #default="{ row }"
        ><el-input v-model="row.name" :disabled="readonly" maxlength="50" placeholder="分项名称"
      /></template>
    </el-table-column>
    <el-table-column label="权重（%）" width="175">
      <template #default="{ row }"
        ><el-input-number
          v-model="row.weight"
          :disabled="readonly"
          :min="0"
          :max="100"
          :precision="2"
          :step="5"
          controls-position="right"
          class="!w-150px"
      /></template>
    </el-table-column>
    <el-table-column v-if="!readonly" label="操作" width="70">
      <template #default="{ $index }"
        ><el-button link type="danger" @click="model.splice($index, 1)">删除</el-button></template
      >
    </el-table-column>
  </el-table>
  <div class="mt-10px flex items-center gap-15px">
    <el-button
      v-if="!readonly"
      plain
      @click="model.push({ name: '', weight: 0, sort: model.length })"
      ><Icon icon="ep:plus" class="mr-5px" />添加分项</el-button
    >
    <span
      >权重合计：{{ model.reduce((sum, i) => sum + (Number(i.weight) || 0), 0).toFixed(2) }}%</span
    >
  </div>
</template>
<script setup lang="ts">
import type { ScoreItem } from '@/api/exam/types'
const model = defineModel<ScoreItem[]>({ required: true })
defineProps<{ readonly?: boolean }>()
</script>
