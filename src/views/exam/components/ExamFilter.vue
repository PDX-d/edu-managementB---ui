<template>
  <el-alert
    v-if="failed"
    title="公共选项加载失败或无查询权限，未使用虚构名单"
    type="error"
    :closable="false"
    class="mb-15px"
  >
    <el-button link type="primary" @click="$emit('reload')">重新加载</el-button>
  </el-alert>
  <el-form :inline="true" :model="model" class="-mb-15px" label-width="68px">
    <el-form-item label="学期">
      <el-select
        v-model="model.semesterId"
        placeholder="请选择学期"
        :loading="loading"
        class="!w-240px"
        @change="resetSession"
      >
        <el-option
          v-for="s in options?.semesters"
          :key="s.id"
          :value="s.id"
          :label="s.name + (s.archived ? '【已归档】' : '')"
        />
      </el-select>
    </el-form-item>
    <el-form-item label="课程">
      <el-select
        v-model="model.courseId"
        placeholder="全部课程"
        clearable
        filterable
        class="!w-240px"
        @change="courseChanged"
      >
        <el-option v-for="c in options?.courses" :key="c.id" :value="c.id" :label="c.name" />
      </el-select>
    </el-form-item>
    <el-form-item label="班级">
      <el-select
        v-model="model.classId"
        placeholder="全部班级"
        clearable
        filterable
        class="!w-240px"
        @change="resetSession"
      >
        <el-option v-for="c in classes" :key="c.id" :value="c.id" :label="c.name" />
      </el-select>
    </el-form-item>
    <el-form-item v-if="withSession" label="考试">
      <SessionPicker v-model="model.sessionId" :query="model" />
    </el-form-item>
    <el-form-item v-if="!withSession" label="考试名称">
      <el-input
        v-model="model.name"
        placeholder="请输入考试名称"
        clearable
        maxlength="100"
        class="!w-240px"
        @keyup.enter="$emit('search')"
      />
    </el-form-item>
    <el-form-item label="考试日期">
      <el-date-picker
        v-model="dates"
        type="daterange"
        value-format="YYYY-MM-DD"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        class="!w-280px"
        @change="dateChanged"
      />
    </el-form-item>
    <slot></slot>
    <el-form-item>
      <el-button @click="$emit('search')"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
      <el-button @click="reset"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
      <slot name="actions"></slot>
    </el-form-item>
  </el-form>
  <div v-if="semester" class="mt-15px text-13px text-[var(--el-text-color-secondary)]">
    {{ semester.startDate }} ～ {{ semester.endDate }}
    <el-tag v-if="semester.archived" type="info" class="ml-10px">归档学期，只读</el-tag>
    <el-tag v-if="options?.mock" type="warning" class="ml-10px">本地模拟公共数据</el-tag>
  </div>
</template>
<script setup lang="ts">
import type { ExamQuery, References } from '@/api/exam/types'
import { key } from '../useExam'
import SessionPicker from './SessionPicker.vue'

const model = defineModel<ExamQuery>({ required: true })
const props = defineProps<{
  options?: References
  loading?: boolean
  failed?: boolean
  withSession?: boolean
}>()
const emit = defineEmits(['search', 'reload'])
const dates = computed<[string, string] | null>({
  get: (): [string, string] | null =>
    model.value.startDate && model.value.endDate
      ? [model.value.startDate, model.value.endDate]
      : null,
  set: (value) => {
    model.value.startDate = value?.[0]
    model.value.endDate = value?.[1]
  }
})
const semester = computed(() =>
  props.options?.semesters.find((s) => key(s.id) === key(model.value.semesterId))
)
const classes = computed(() => {
  const course = props.options?.courses.find((c) => key(c.id) === key(model.value.courseId))
  return props.options?.classes.filter(
    (c) => !course || course.classIds.some((id) => key(id) === key(c.id))
  )
})
const resetSession = () => {
  model.value.sessionId = undefined
}
const courseChanged = () => {
  model.value.classId = undefined
  resetSession()
}
const dateChanged = () => {
  model.value.startDate = dates.value?.[0]
  model.value.endDate = dates.value?.[1]
  resetSession()
}
const reset = () => {
  model.value = {
    pageNo: 1,
    pageSize: model.value.pageSize,
    semesterId: props.options?.currentSemesterId ?? undefined
  }
  dates.value = null
  emit('search')
}
</script>
