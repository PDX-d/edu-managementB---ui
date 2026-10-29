<template>
  <Dialog
    v-model="visible"
    :title="batch ? '批量自动分配床位' : '手动分配床位'"
    width="700px"
    :before-close="close"
    :close-on-click-modal="false"
  >
    <el-form ref="formRef" :model="data" label-width="110px" :disabled="saving || !ready">
      <template v-if="batch">
        <el-form-item label="学生名单" prop="studentIds" :rules="required"
          ><DormMultiPicker v-model="data.studentIds" kind="student" :limit="200"
        /></el-form-item>
        <el-form-item label="楼栋范围" prop="buildingIds" :rules="required"
          ><DormMultiPicker v-model="data.buildingIds" kind="building" :limit="100"
        /></el-form-item>
        <el-alert
          title="按稳定顺序匹配性别并分配空床，整批成功或回滚；不进行智能合寝。"
          type="info"
          :closable="false"
        />
      </template>
      <template v-else>
        <el-form-item label="学生" prop="studentId" :rules="required"
          ><DormPicker
            v-model="data.studentId"
            kind="student"
            @update:model-value="data.bedId = undefined"
        /></el-form-item>
        <el-form-item label="楼栋范围"
          ><DormPicker
            v-model="data.buildingId"
            kind="building"
            @update:model-value="data.bedId = undefined"
        /></el-form-item>
        <el-form-item label="可用床位" prop="bedId" :rules="required"
          ><DormPicker
            v-model="data.bedId"
            kind="bed"
            :disabled="!data.studentId"
            :params="{ studentId: data.studentId, buildingId: data.buildingId }"
        /></el-form-item>
      </template>
    </el-form>
    <template #footer
      ><el-button type="primary" :loading="saving" :disabled="!ready" @click="submit"
        >确认分配</el-button
      ><el-button :disabled="saving" @click="close">取消</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id } from '@/api/dorm/types'
import DormPicker from '../components/DormPicker.vue'
import DormMultiPicker from '../components/DormMultiPicker.vue'
import { useDormDialog } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const batch = ref(false)
const formRef = ref<FormInstance>()
const required = [{ required: true, message: '请选择至少一项', trigger: 'change' }]
const {
  visible,
  saving,
  ready,
  data,
  open: show,
  close,
  execute
} = useDormDialog(() => ({
  studentId: undefined as Id | undefined,
  bedId: undefined as Id | undefined,
  buildingId: undefined as Id | undefined,
  studentIds: [] as Id[],
  buildingIds: [] as Id[]
}))
const open = async (auto = false) => {
  if (saving.value) return
  batch.value = auto
  await show()
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  if (!(await formRef.value?.validate().catch(() => false))) return
  if (current !== data.value) return
  await execute(
    (v) =>
      batch.value
        ? Api.autoAssign({ studentIds: v.studentIds, buildingIds: v.buildingIds })
        : Api.assign({ studentId: v.studentId!, bedId: v.bedId! }),
    'stay:assign',
    () => emit('success')
  )
}
defineExpose({ open })
</script>
