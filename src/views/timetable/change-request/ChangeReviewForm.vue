<template>
  <Dialog
    v-model="dialogVisible"
    :title="action === 'approve' ? '审批通过' : '审批拒绝'"
    width="560px"
  >
    <el-alert
      v-if="action === 'approve'"
      class="mb-12px"
      type="info"
      :closable="false"
      title="通过后系统将重新校验课次版本、学期、时间及冲突，校验通过才会更新课表并通知相关学生。"
    />
    <el-form ref="formRef" :model="formData" :rules="formRules" label-width="80px">
      <el-form-item label="审批意见" prop="reason">
        <el-input
          v-model="formData.reason"
          type="textarea"
          :rows="4"
          maxlength="1000"
          show-word-limit
          placeholder="请输入审批意见"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button
        :loading="formLoading"
        :type="action === 'approve' ? 'primary' : 'danger'"
        @click="submitForm"
      >
        {{ action === 'approve' ? '确认通过' : '确认拒绝' }}
      </el-button>
      <el-button :disabled="formLoading" @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ChangeRequestApi from '@/api/timetable/changeRequest'
import type { TimetableId } from '@/api/timetable/types'

defineOptions({ name: 'TimetableChangeReviewForm' })

const message = useMessage()

const dialogVisible = ref(false)
const formLoading = ref(false) // 请求过程中防止重复提交
const formRef = ref()
const action = ref<'approve' | 'reject'>('approve')
const requestId = ref<TimetableId>()
const formData = ref({ reason: '' })
const formRules = reactive({
  reason: [{ required: true, whitespace: true, message: '审批意见不能为空', trigger: 'blur' }]
})

/** 打开弹窗 */
const open = (type: 'approve' | 'reject', id: TimetableId) => {
  dialogVisible.value = true
  action.value = type
  requestId.value = id
  formData.value = { reason: '' }
  formRef.value?.resetFields()
}
defineExpose({ open })

/** 提交审批；无论成功失败都通知父组件按后端实际状态刷新 */
const emit = defineEmits(['success', 'failed'])
const submitForm = async () => {
  if (formLoading.value || !formRef.value) return
  if (!(await formRef.value.validate().catch(() => false))) return
  const text = action.value === 'approve' ? '通过' : '拒绝'
  try {
    await message.confirm(`确认${text}该申请吗？审批后不可撤销。`)
  } catch {
    return
  }
  formLoading.value = true
  try {
    const data = { id: requestId.value!, reason: formData.value.reason.trim() }
    if (action.value === 'approve') {
      await ChangeRequestApi.approveChangeRequest(data)
    } else {
      await ChangeRequestApi.rejectChangeRequest(data)
    }
    message.success(`已${text}`)
    dialogVisible.value = false
    emit('success')
  } catch {
    // 审批失败：错误信息已由请求封装提示，保持弹窗以便查看，并按实际状态刷新列表
    emit('failed')
  } finally {
    formLoading.value = false
  }
}
</script>
