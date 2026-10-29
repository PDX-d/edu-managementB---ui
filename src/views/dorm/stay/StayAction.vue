<template>
  <Dialog
    v-model="visible"
    :title="titles[mode]"
    width="660px"
    :before-close="close"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="data"
      label-width="125px"
      :disabled="saving || !ready"
    >
      <el-descriptions :column="1" border class="mb-15px"
        ><el-descriptions-item label="学生"
          >{{ data.stay?.studentNo }} · {{ data.stay?.studentName }}</el-descriptions-item
        ><el-descriptions-item label="床位">{{ data.stay?.bedLabel }}</el-descriptions-item
        ><el-descriptions-item label="状态">{{
          label(data.stay?.status)
        }}</el-descriptions-item></el-descriptions
      >
      <el-form-item v-if="mode === 'check-in'" label="线下实收押金" prop="amount" :rules="required"
        ><el-input-number v-model="data.amount" :min="0" :max="9999999999.99" :precision="2"
      /></el-form-item>
      <template v-if="mode === 'check-out'">
        <el-form-item label="原押金">{{ money(data.stay?.depositAmount) }} 元</el-form-item>
        <el-form-item label="物品检查" prop="inspection" :rules="required"
          ><el-input v-model="data.inspection" type="textarea" maxlength="1000" show-word-limit
        /></el-form-item>
        <el-form-item label="线下扣款" prop="amount" :rules="required"
          ><el-input-number
            v-model="data.amount"
            :min="0"
            :max="Number(data.stay?.depositAmount ?? 0)"
            :precision="2"
        /></el-form-item>
        <el-form-item label="扣款原因" prop="reason" :rules="data.amount > 0 ? required : []"
          ><el-input v-model="data.reason" type="textarea" maxlength="500" show-word-limit
        /></el-form-item>
        <el-form-item label="预计应退"
          >{{ money(refundAmount) }} 元（以服务端计算为准）</el-form-item
        >
      </template>
      <el-alert
        v-if="mode === 'confirm-refund'"
        :title="`确认已在线下退还 ${money(data.stay?.refundAmount)} 元？仅登记，不发起支付。`"
        type="warning"
        :closable="false"
      />
      <el-alert
        v-else-if="mode === 'cancel'"
        title="取消待入住分配后释放床位，此操作不代表实际退宿。"
        type="warning"
        :closable="false"
      />
      <el-alert
        v-else
        title="本页仅登记线下处理；存在待审调宿申请时，请先处理或取消申请。版本冲突不会自动覆盖。"
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
import type { Id, Stay } from '@/api/dorm/types'
import { label, money, useDormDialog, version } from '../useDorm'
type Mode = 'check-in' | 'check-out' | 'confirm-refund' | 'cancel'
const titles = {
  'check-in': '登记入住',
  'check-out': '登记退宿',
  'confirm-refund': '确认线下退款',
  cancel: '取消待入住'
}
const emit = defineEmits<{ success: [] }>()
const mode = ref<Mode>('check-in')
const formRef = ref<FormInstance>()
const required = [{ required: true, message: '此项必填', trigger: 'blur' }]
const initial = () => ({
  stay: undefined as Stay | undefined,
  amount: 0,
  inspection: '',
  reason: ''
})
const { visible, loading, saving, ready, data, open: show, close, execute } = useDormDialog(initial)
const refundAmount = computed(
  () =>
    (Math.round(Number(data.value.stay?.depositAmount ?? 0) * 100) -
      Math.round(data.value.amount * 100)) /
    100
)
const open = async (action: Mode, id: Id) => {
  if (saving.value) return
  mode.value = action
  await show(async () => ({ ...initial(), stay: await Api.stay(id) }))
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false)) || !data.value.stay) return
  if (current !== data.value) return
  const s = data.value.stay
  const eligible =
    mode.value === 'check-in' || mode.value === 'cancel'
      ? s.status === 'RESERVED'
      : mode.value === 'check-out'
        ? s.status === 'OCCUPIED'
        : s.status === 'CHECKED_OUT' && s.refundStatus === 'PENDING'
  if (!eligible) {
    ElMessage.warning('当前住宿状态不允许此操作，请关闭并刷新')
    return
  }
  if (
    !Number.isFinite(data.value.amount) ||
    data.value.amount < 0 ||
    (mode.value === 'check-out' && refundAmount.value < 0)
  ) {
    ElMessage.warning('金额无效或扣款超过押金')
    return
  }
  const permission = mode.value === 'confirm-refund' ? 'stay:refund' : `stay:${mode.value}`
  await execute(
    (v) => {
      const base = version(v.stay!)
      if (mode.value === 'check-in') return Api.checkIn({ ...base, depositAmount: v.amount })
      if (mode.value === 'check-out')
        return Api.checkOut({
          ...base,
          inspection: v.inspection.trim(),
          deductionAmount: v.amount,
          deductionReason: v.reason.trim()
        })
      return mode.value === 'cancel' ? Api.cancelStay(base) : Api.refund(base)
    },
    permission,
    () => emit('success')
  )
}
defineExpose({ open })
</script>
