<template>
  <Dialog
    v-model="visible"
    :title="linkOnly ? '关联外部处分' : editing ? '更正违规记录' : '新增违规记录'"
    width="660px"
    :before-close="close"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="data"
      label-width="110px"
      :disabled="saving || !ready"
    >
      <template v-if="!linkOnly">
        <el-form-item label="住宿记录" prop="stayId" :rules="required"
          ><DormPicker
            v-model="data.stayId"
            kind="stay"
            occupied-only
            :disabled="editing"
            :selected-label="data.stayLabel"
        /></el-form-item>
        <el-form-item label="发生时间" prop="occurredAt" :rules="required"
          ><el-date-picker
            v-model="data.occurredAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
        /></el-form-item>
        <el-form-item label="违规类型" prop="type" :rules="required"
          ><el-input v-model="data.type" maxlength="50"
        /></el-form-item>
        <el-form-item label="违规说明" prop="description" :rules="required"
          ><el-input v-model="data.description" type="textarea" maxlength="2000" show-word-limit
        /></el-form-item>
      </template>
      <el-form-item
        label="外部处分 ID"
        prop="disciplineId"
        :rules="[
          {
            required: linkOnly,
            pattern: /^[1-9]\d*$/,
            message: '请输入真实处分记录的正整数 ID',
            trigger: 'blur'
          }
        ]"
        ><el-input
          v-model="data.disciplineId"
          clearable
          placeholder="可选；由公共适配器验证归属"
          maxlength="19"
      /></el-form-item>
      <el-alert
        title="只登记违规并关联外部处分，不创建处分记录；未接入真实处分适配器时关联会明确失败。发生时间须位于实际住宿期间，且不晚于现在；已有关联不能通过清空输入解除。"
        type="info"
        :closable="false"
      />
    </el-form>
    <template #footer
      ><el-button type="primary" :loading="saving" :disabled="!ready" @click="submit"
        >保存</el-button
      ><el-button :disabled="saving" @click="close">取消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id, Violation } from '@/api/dorm/types'
import { formatBizTime, parseBizTime, useDormDialog, version } from '../useDorm'
import DormPicker from '../components/DormPicker.vue'
const emit = defineEmits<{ success: [] }>()
const editing = ref(false)
const linkOnly = ref(false)
const formRef = ref<FormInstance>()
const required = [{ required: true, message: '此项必填', trigger: 'change' }]
const initial = () => ({
  row: undefined as Violation | undefined,
  stayId: undefined as Id | undefined,
  stayLabel: '',
  occurredAt: formatBizTime(Date.now()),
  type: '',
  description: '',
  disciplineId: ''
})
const { visible, loading, saving, ready, data, open: show, close, execute } = useDormDialog(initial)
const open = async (id?: Id, link = false) => {
  if (saving.value) return
  editing.value = id != null
  linkOnly.value = link
  await show(
    id == null
      ? undefined
      : async () => {
          const row = await Api.violation(id)
          return {
            row,
            stayId: row.stayId,
            stayLabel: `${row.studentNo} · ${row.studentName} · ${row.bedLabel}`,
            occurredAt: formatBizTime(row.occurredAt),
            type: row.type,
            description: row.description,
            disciplineId: row.disciplineId == null ? '' : String(row.disciplineId)
          }
        }
  )
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false))) return
  if (current !== data.value) return
  if (
    !linkOnly.value &&
    (!data.value.type.trim() ||
      !data.value.description.trim() ||
      !Number.isFinite(parseBizTime(data.value.occurredAt)))
  ) {
    ElMessage.warning('请填写有效的发生时间、类型和说明')
    return
  }
  await execute(
    (v) =>
      linkOnly.value
        ? Api.linkDiscipline({ ...version(v.row!), disciplineId: v.disciplineId })
        : Api.saveViolation({
            ...(v.row ? version(v.row) : {}),
            stayId: v.stayId,
            occurredAt: parseBizTime(v.occurredAt),
            type: v.type.trim(),
            description: v.description.trim(),
            disciplineId: v.disciplineId || undefined
          }),
    'violation:update',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
