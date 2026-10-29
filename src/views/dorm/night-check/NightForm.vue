<template>
  <Dialog
    v-model="visible"
    title="更正查寝历史"
    width="620px"
    :before-close="close"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="data"
      label-width="100px"
      :disabled="saving || !ready"
    >
      <el-form-item label="学生"
        >{{ data.row?.studentName }} · {{ data.row?.studentNo }}</el-form-item
      ><el-form-item label="日期 / 床位"
        >{{ data.row?.checkDate }} / {{ data.row?.bedLabel }}</el-form-item
      >
      <el-form-item label="结果"
        ><el-select v-model="data.status"
          ><el-option label="在寝" value="PRESENT" /><el-option
            label="不在寝"
            value="ABSENT" /></el-select
      ></el-form-item>
      <el-form-item
        label="原因"
        prop="reason"
        :rules="[
          { required: data.status === 'ABSENT', message: '不在寝必须填写原因', trigger: 'blur' }
        ]"
        ><el-input v-model="data.reason" type="textarea" maxlength="500" show-word-limit
      /></el-form-item>
    </el-form>
    <template #footer
      ><el-button type="primary" :loading="saving" :disabled="!ready" @click="submit"
        >保存更正</el-button
      ><el-button :disabled="saving" @click="close">取消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id, Night } from '@/api/dorm/types'
import { useDormDialog, version } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const formRef = ref<FormInstance>()
const {
  visible,
  loading,
  saving,
  ready,
  data,
  open: show,
  close,
  execute
} = useDormDialog(() => ({ row: undefined as Night | undefined, status: 'PRESENT', reason: '' }))
const open = async (id: Id) => {
  await show(async () => {
    const row = await Api.night(id)
    return { row, status: row.status, reason: row.reason ?? '' }
  })
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false)) || !data.value.row) return
  if (current !== data.value) return
  if (data.value.status === 'ABSENT' && !data.value.reason.trim()) {
    ElMessage.warning('请填写不在寝原因')
    return
  }
  await execute(
    (v) =>
      Api.saveNights([
        {
          ...version(v.row!),
          stayId: v.row!.stayId,
          checkDate: v.row!.checkDate,
          status: v.status,
          reason: v.reason.trim()
        }
      ]),
    'night-check:update',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
