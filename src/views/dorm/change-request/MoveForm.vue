<template>
  <Dialog
    v-model="visible"
    :title="direct ? '工作人员直接调床' : '申请调宿'"
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
      <el-form-item label="学生"
        >{{ data.stay?.studentNo }} · {{ data.stay?.studentName }}</el-form-item
      >
      <el-form-item label="原床位">{{ data.stay?.bedLabel }}</el-form-item>
      <el-form-item label="楼栋范围"
        ><DormPicker
          v-model="data.buildingId"
          kind="building"
          @update:model-value="data.targetBedId = undefined"
      /></el-form-item>
      <el-form-item label="目标空床" prop="targetBedId" :rules="required"
        ><DormPicker
          v-model="data.targetBedId"
          kind="bed"
          :params="{ studentId: data.stay?.studentId, buildingId: data.buildingId }"
      /></el-form-item>
      <el-form-item label="调整原因" prop="reason" :rules="required"
        ><el-input v-model="data.reason" type="textarea" maxlength="500" show-word-limit
      /></el-form-item>
      <el-alert
        :title="
          direct
            ? '立即调整并保留历史；存在待审申请时需先处理或取消。'
            : '申请期间不占用目标床位，不改变现有住宿；审批时重新校验床位和住宿版本。'
        "
        type="info"
        :closable="false"
      />
    </el-form>
    <template #footer
      ><el-button type="primary" :loading="saving" :disabled="!ready" @click="submit">{{
        direct ? '确认调整' : '提交申请'
      }}</el-button
      ><el-button :disabled="saving" @click="close">取消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id, Stay } from '@/api/dorm/types'
import DormPicker from '../components/DormPicker.vue'
import { useDormDialog } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const direct = ref(false)
const formRef = ref<FormInstance>()
const required = [{ required: true, message: '此项必填', trigger: 'change' }]
const initial = () => ({
  stay: undefined as Stay | undefined,
  buildingId: undefined as Id | undefined,
  targetBedId: undefined as Id | undefined,
  reason: ''
})
const { visible, loading, saving, ready, data, open: show, close, execute } = useDormDialog(initial)
const open = async (stayId: Id, staff = false) => {
  if (saving.value) return
  direct.value = staff
  await show(async () => ({ ...initial(), stay: await Api.stay(stayId) }))
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false)) || !data.value.stay) return
  if (current !== data.value) return
  const s = data.value.stay
  if (s.status !== 'OCCUPIED' && !(direct.value && s.status === 'RESERVED')) {
    ElMessage.warning('当前住宿状态不允许调宿')
    return
  }
  if (!data.value.reason.trim()) {
    ElMessage.warning('请填写调整原因')
    return
  }
  await execute(
    (v) =>
      (direct.value ? Api.directAdjust : Api.createChange)({
        stayId: v.stay!.id,
        stayVersion: v.stay!.rowVersion,
        targetBedId: v.targetBedId!,
        reason: v.reason.trim()
      }),
    direct.value ? 'change-request:direct' : 'change-request:create',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
