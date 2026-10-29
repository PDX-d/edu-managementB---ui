<template>
  <Dialog
    v-model="visible"
    title="离校记录审核"
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
        >{{ data.row?.studentNo }} · {{ data.row?.studentName }}</el-form-item
      ><el-form-item label="离校时间">{{ formatBizTime(data.row?.departTime) }}</el-form-item>
      <el-form-item label="审核结果"
        ><el-radio-group v-model="data.status"
          ><el-radio value="APPROVED">通过</el-radio
          ><el-radio value="REJECTED">拒绝</el-radio></el-radio-group
        ></el-form-item
      >
      <el-form-item
        label="审核说明"
        prop="reason"
        :rules="[{ required: true, message: '请填写审核说明', trigger: 'blur' }]"
        ><el-input v-model="data.reason" type="textarea" maxlength="500" show-word-limit
      /></el-form-item>
      <el-alert
        title="审核与实际离返校状态分离：拒绝不会撤销离校事实，也不会阻止本人返校打卡。"
        type="warning"
        :closable="false"
      />
    </el-form>
    <template #footer
      ><el-button type="primary" :loading="saving" :disabled="!ready" @click="submit"
        >确认审核</el-button
      ><el-button :disabled="saving" @click="close">取消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id, Trip } from '@/api/dorm/types'
import { formatBizTime, useDormDialog, version } from '../useDorm'
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
} = useDormDialog(() => ({ row: undefined as Trip | undefined, status: 'APPROVED', reason: '' }))
const open = async (id: Id) => {
  await show(async () => ({ row: await Api.trip(id), status: 'APPROVED', reason: '' }))
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false)) || !data.value.row) return
  if (current !== data.value) return
  if (data.value.row.reviewStatus !== 'PENDING' || !data.value.reason.trim()) {
    ElMessage.warning('仅待审核记录可审核，且必须填写说明')
    return
  }
  await execute(
    (v) => Api.reviewTrip({ ...version(v.row!), status: v.status, reason: v.reason.trim() }),
    'travel:review',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
