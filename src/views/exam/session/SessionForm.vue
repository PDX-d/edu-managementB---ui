<template>
  <Dialog v-model="visible" :title="form.id ? '编辑考试' : '新增考试'" width="760px">
    <SyncNotice :stale="sync.stale.value" :dirty="dirty" :busy="loading" @refresh="sync.refresh" />
    <el-alert
      v-if="failed"
      title="公共选项加载失败，请关闭后重试；不能手工填入 ID 代替公共数据"
      type="error"
      :closable="false"
      class="mb-15px"
    />
    <el-alert v-if="blocked" :title="blocked" type="warning" :closable="false" class="mb-15px" />
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="form"
      :rules="rules"
      label-width="100px"
      :disabled="loading || !ready || !!blocked"
    >
      <el-form-item label="考试名称" prop="name"
        ><el-input v-model="form.name" maxlength="100"
      /></el-form-item>
      <el-form-item label="学期" prop="semesterId">
        <el-select v-model="form.semesterId" class="w-full" @change="semesterChanged">
          <el-option
            v-for="s in options?.semesters"
            :key="s.id"
            :value="s.id"
            :label="s.name + (s.archived ? '【已归档】' : '')"
            :disabled="s.archived"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="课程" prop="courseId"
        ><el-select v-model="form.courseId" filterable class="w-full" @change="form.classIds = []"
          ><el-option
            v-for="c in options?.courses"
            :key="c.id"
            :value="c.id"
            :label="c.name" /></el-select
      ></el-form-item>
      <el-form-item label="班级" prop="classIds"
        ><el-select v-model="form.classIds" multiple filterable class="w-full"
          ><el-option v-for="c in classes" :key="c.id" :value="c.id" :label="c.name" /></el-select
      ></el-form-item>
      <el-form-item label="考场" prop="venueId"
        ><el-select v-model="form.venueId" filterable class="w-full"
          ><el-option
            v-for="v in venues"
            :key="v.id"
            :value="v.id"
            :label="`${v.name}（${v.capacity}人）`"
            :disabled="v.status !== 0" /></el-select
      ></el-form-item>
      <el-form-item label="开始时间" prop="startTime"
        ><el-date-picker
          v-model="form.startTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="北京时间"
          class="!w-full"
      /></el-form-item>
      <el-form-item label="结束时间" prop="endTime"
        ><el-date-picker
          v-model="form.endTime"
          type="datetime"
          value-format="YYYY-MM-DD HH:mm:ss"
          placeholder="北京时间"
          class="!w-full"
      /></el-form-item>
      <el-form-item v-if="!form.id" label="成绩分项"
        ><div class="w-full"><ScoreItems v-model="items" /></div
      ></el-form-item>
      <el-form-item v-if="form.id" label="刷新名册"
        ><el-checkbox v-model="form.refreshParticipants"
          >重新获取班级学生（将替换原名册）</el-checkbox
        ></el-form-item
      >
    </el-form>
    <el-alert
      v-if="semester"
      :title="`学期范围：${semester.startDate} ～ ${semester.endDate}；时间均为北京时间`"
      type="info"
      :closable="false"
    />
    <template #footer
      ><el-button type="primary" :disabled="!ready || !!blocked" :loading="loading" @click="submit"
        >确 定</el-button
      ><el-button @click="visible = false">取 消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import * as api from '@/api/exam'
import type { ExamId, ScoreItem, SessionSave, Venue } from '@/api/exam/types'
import { can, key, sessionLocked, timeError, useExam, validateItems } from '../useExam'
import ScoreItems from '../components/ScoreItems.vue'
import SyncNotice from '../components/SyncNotice.vue'
import { useExamSync } from '../useExamSync'

const { options, failed, load: loadReferences, semesterOf } = useExam()
const visible = ref(false)
const loading = ref(false)
const ready = ref(false)
const blocked = ref('')
let revision = 0
const isCurrent = (current: number) => visible.value && current === revision
watch(
  visible,
  (value) => {
    if (!value) {
      revision++
      ready.value = false
      loading.value = false
    }
  },
  { flush: 'sync' }
)
onBeforeUnmount(() => {
  revision++
})
const empty = (): SessionSave => ({
  name: '',
  classIds: [],
  startTime: '',
  endTime: '',
  refreshParticipants: false
})
const form = ref<SessionSave>(empty())
const items = ref<ScoreItem[]>([])
const baseline = ref('')
const dirty = computed(
  () => ready.value && JSON.stringify([form.value, items.value]) !== baseline.value
)
const venues = ref<Venue[]>([])
const formRef = ref<FormInstance>()
const message = useMessage()
const emit = defineEmits(['success'])
const semester = computed(() => semesterOf(form.value.semesterId))
const semesterChanged = () => {
  form.value.courseId = undefined
  form.value.classIds = []
}
const classes = computed(() => {
  const course = options.value?.courses.find((c) => key(c.id) === key(form.value.courseId))
  return (
    options.value?.classes.filter((c) => course?.classIds.some((id) => key(id) === key(c.id))) ?? []
  )
})
const rules: FormRules = Object.fromEntries(
  ['name', 'semesterId', 'courseId', 'classIds', 'venueId', 'startTime', 'endTime'].map((field) => [
    field,
    [{ required: true, message: '此项不能为空', trigger: 'change' }]
  ])
)
const open = async (id?: ExamId, semesterId?: ExamId) => {
  if (!can(id ? 'session:update' : 'session:create')) return
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  visible.value = true
  loading.value = true
  ready.value = false
  blocked.value = ''
  form.value = empty()
  venues.value = []
  items.value = [
    { name: '平时成绩', weight: 30, sort: 0 },
    { name: '卷面成绩', weight: 70, sort: 1 }
  ]
  formRef.value?.clearValidate()
  try {
    await loadReferences()
    if (!isCurrent(current) || !options.value) return
    const venueOptions = await api.getVenues()
    if (!isCurrent(current)) return
    venues.value = venueOptions
    if (id) {
      const data = await api.getSession(id)
      if (!isCurrent(current)) return
      form.value = {
        id: data.id,
        sessionVersion: data.sessionVersion,
        name: data.name,
        semesterId: data.semesterId,
        courseId: data.courseId,
        classIds: [...data.classIds],
        venueId: data.venueId,
        startTime: data.startTime,
        endTime: data.endTime,
        refreshParticipants: false
      }
      if (sessionLocked(data)) blocked.value = '此考试已归档、已开始或名册已冻结，不能修改安排'
      if (!venues.value.some((v) => key(v.id) === key(data.venueId)))
        venues.value.push({
          id: data.venueId,
          name: data.venueName,
          capacity: data.venueCapacity,
          status: 1
        } as Venue)
      if (
        !semester.value ||
        !options.value.courses.some((c) => key(c.id) === key(data.courseId)) ||
        data.classIds.some((id) => !classes.value.some((c) => key(c.id) === key(id)))
      )
        blocked.value = '原有学期、课程或班级已不在当前选项范围内，请先联系管理员确认，未清空原值'
    } else form.value.semesterId = semesterId ?? options.value.currentSemesterId ?? undefined
    baseline.value = JSON.stringify([form.value, items.value])
    ready.value = true
    sync.settled(ticket)
  } finally {
    if (isCurrent(current)) loading.value = false
  }
}
const submit = async () => {
  if (
    !ready.value ||
    blocked.value ||
    loading.value ||
    !can(form.value.id ? 'session:update' : 'session:create')
  )
    return
  const current = revision
  if (!(await formRef.value?.validate().catch(() => false))) return
  if (!isCurrent(current)) return
  const error = semester.value?.archived
    ? '归档学期只读'
    : timeError(form.value.startTime, form.value.endTime, semester.value) ||
      (!form.value.classIds.length ? '请选择考试班级' : '') ||
      (!form.value.id ? validateItems(items.value) : '')
  if (error) return message.warning(error)
  if (form.value.refreshParticipants) {
    try {
      await message.confirm('确认重新获取学生并替换本场考试名册？')
    } catch {
      return
    }
  }
  if (!isCurrent(current)) return
  loading.value = true
  try {
    const data: SessionSave = { ...form.value, name: form.value.name.trim() }
    if (!data.id) {
      data.scoreItems = items.value.map((item, sort) => ({ ...item, name: item.name.trim(), sort }))
      delete data.refreshParticipants
    }
    await api.saveSession(data)
    emit('success')
    if (!isCurrent(current)) return
    message.success('保存成功')
    visible.value = false
  } finally {
    if (isCurrent(current)) loading.value = false
  }
}
const sync = useExamSync({
  matches: (change) =>
    change.type === 'venue' || !change.sessionId || key(change.sessionId) === key(form.value.id),
  dirty: () => dirty.value,
  busy: () => loading.value,
  enabled: () => visible.value,
  reload: () => open(form.value.id, form.value.semesterId),
  reset: () => {
    visible.value = false
    revision++
    form.value = empty()
    items.value = []
  }
})
defineExpose({ open })
</script>
