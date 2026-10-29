<template>
  <Dialog
    v-model="visible"
    :title="approve ? '通过调宿申请' : '拒绝调宿申请'"
    width="640px"
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
      >
      <el-form-item label="原床位">{{ data.row?.sourceBedLabel }}</el-form-item
      ><el-form-item label="目标床位">{{ data.row?.targetBedLabel }}</el-form-item
      ><el-form-item label="申请原因">{{ data.row?.reason }}</el-form-item>
      <el-form-item
        label="审核说明"
        prop="reason"
        :rules="[{ required: !approve, message: '拒绝时必须填写说明', trigger: 'blur' }]"
        ><el-input v-model="data.reason" type="textarea" maxlength="500" show-word-limit
      /></el-form-item>
      <el-alert
        title="通过时重新校验住宿版本和空床；版本过期需申请人重新申请，不会自动覆盖。"
        type="info"
        :closable="false"
      />
    </el-form>
    <template #footer
      ><el-button type="primary" :loading="saving" :disabled="!ready" @click="submit"
        >确认</el-button
      ><el-button :disabled="saving" @click="close">取消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id, Change } from '@/api/dorm/types'
import { useDormDialog, version } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const approve = ref(true)
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
} = useDormDialog(() => ({ row: undefined as Change | undefined, reason: '' }))
const open = async (id: Id, approved: boolean) => {
  if (saving.value) return
  approve.value = approved
  await show(async () => ({ row: await Api.change(id), reason: '' }))
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false)) || !data.value.row) return
  if (current !== data.value) return
  if (data.value.row.status !== 'PENDING' || (!approve.value && !data.value.reason.trim())) {
    ElMessage.warning('仅待审申请可审核；拒绝需填写说明')
    return
  }
  await execute(
    (v) => Api.reviewChange(approve.value, { ...version(v.row!), reason: v.reason.trim() }),
    'change-request:approve',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
