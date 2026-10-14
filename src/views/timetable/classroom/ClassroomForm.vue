<template>
  <Dialog v-model="dialogVisible" :title="dialogTitle">
    <el-form
      ref="formRef"
      v-loading="formLoading"
      :model="formData"
      :rules="formRules"
      label-width="80px"
    >
      <el-form-item label="教室编号" prop="code">
        <el-input v-model="formData.code" maxlength="64" placeholder="请输入教室编号" />
      </el-form-item>
      <el-form-item label="教室名称" prop="name">
        <el-input v-model="formData.name" maxlength="128" placeholder="请输入教室名称" />
      </el-form-item>
      <el-form-item label="位置" prop="location">
        <el-input v-model="formData.location" maxlength="255" placeholder="请输入教室位置" />
      </el-form-item>
      <el-form-item label="容量" prop="capacity">
        <el-input-number
          v-model="formData.capacity"
          :min="1"
          :step="1"
          :precision="0"
          step-strictly
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio v-for="item in CLASSROOM_STATUS_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="formLoading" type="primary" @click="submitForm">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ClassroomApi from '@/api/timetable/classroom'
import type { TimetableId } from '@/api/timetable/types'
import { CLASSROOM_STATUS_OPTIONS } from '../utils'

defineOptions({ name: 'TimetableClassroomForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref<ClassroomApi.ClassroomSaveReqVO>(emptyForm())
const formRules = reactive({
  code: [{ required: true, message: '教室编号不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '教室名称不能为空', trigger: 'blur' }],
  location: [{ required: true, message: '教室位置不能为空', trigger: 'blur' }],
  capacity: [{ required: true, message: '容量必须为正整数', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})
const formRef = ref() // 表单 Ref

function emptyForm(): ClassroomApi.ClassroomSaveReqVO {
  return { id: undefined, code: '', name: '', location: '', capacity: 1, status: 0 }
}

/** 打开弹窗 */
const open = async (type: string, id?: TimetableId) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      const data = await ClassroomApi.getClassroom(id)
      formData.value = {
        id: data.id,
        code: data.code,
        name: data.name,
        location: data.location,
        capacity: data.capacity,
        status: data.status
      }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 提交表单 */
const emit = defineEmits(['success']) // 定义 success 事件，用于操作成功后的回调
const submitForm = async () => {
  // 校验表单
  if (!formRef.value) return
  const valid = await formRef.value.validate()
  if (!valid) return
  // 提交请求
  formLoading.value = true
  try {
    const data = { ...formData.value }
    if (formType.value === 'create') {
      delete data.id
      await ClassroomApi.createClassroom(data)
      message.success(t('common.createSuccess'))
    } else {
      await ClassroomApi.updateClassroom(data)
      message.success(t('common.updateSuccess'))
    }
    dialogVisible.value = false
    // 发送操作成功的事件
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 重置表单 */
const resetForm = () => {
  formData.value = emptyForm()
  formRef.value?.resetFields()
}
</script>
