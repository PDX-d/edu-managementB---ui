<template>
  <Dialog
    v-model="visible"
    :title="editing ? '更正卫生评分' : '新增卫生评分'"
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
      <el-form-item label="房间" prop="roomId" :rules="required"
        ><DormPicker
          v-model="data.roomId"
          kind="room"
          :disabled="editing"
          :selected-label="data.roomLabel"
      /></el-form-item>
      <el-form-item label="检查日期" prop="checkDate" :rules="required"
        ><el-date-picker
          v-model="data.checkDate"
          type="date"
          value-format="YYYY-MM-DD"
          :disabled="editing"
          :disabled-date="disabledDate"
      /></el-form-item>
      <el-form-item label="评分" prop="score" :rules="required"
        ><el-input-number v-model="data.score" :min="0" :max="100" :precision="0"
      /></el-form-item>
      <el-form-item label="备注"
        ><el-input v-model="data.remark" type="textarea" maxlength="1000" show-word-limit
      /></el-form-item>
      <el-alert
        title="每房间每天一条；低于 60 分不合格，新增不合格或由合格转不合格时通知辅导员。辅导员仅能检查有本班学生入住的房间。"
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
import type { Id, HygieneSave } from '@/api/dorm/types'
import DormPicker from '../components/DormPicker.vue'
import { today, useDormDialog } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const editing = ref(false)
const formRef = ref<FormInstance>()
const required = [{ required: true, message: '此项必填', trigger: 'change' }]
const {
  visible,
  loading,
  saving,
  ready,
  data,
  open: show,
  close,
  execute
} = useDormDialog<HygieneSave & { roomLabel?: string }>(() => ({
  roomId: undefined,
  checkDate: today(),
  score: 100,
  remark: ''
}))
const disabledDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` >
  today()
const open = async (id?: Id) => {
  if (saving.value) return
  editing.value = id != null
  await show(
    id == null
      ? undefined
      : async () => {
          const row = await Api.hygiene(id)
          return {
            id: row.id,
            rowVersion: row.rowVersion,
            roomId: row.roomId,
            roomLabel: row.roomLabel,
            checkDate: row.checkDate,
            score: row.score,
            remark: row.remark ?? ''
          }
        }
  )
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false))) return
  if (current !== data.value) return
  if (data.value.checkDate > today() || !Number.isInteger(data.value.score)) {
    ElMessage.warning('检查日期不能在未来，评分须为 0～100 整数')
    return
  }
  await execute(
    (v) => Api.saveHygiene(v),
    'hygiene:update',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
