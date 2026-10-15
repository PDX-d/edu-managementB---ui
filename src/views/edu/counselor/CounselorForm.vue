<!-- 辅导员表单 -->
<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="工号" prop="jobNo">
        <el-input v-model="formData.jobNo" placeholder="请输入工号" />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input v-model="formData.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="性别" prop="gender">
        <el-radio-group v-model="formData.gender">
          <el-radio
            v-for="dict in getIntDictOptions(DICT_TYPE.SYSTEM_USER_SEX)"
            :key="dict.value"
            :value="dict.value"
          >
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="联系方式" prop="mobile">
        <el-input v-model="formData.mobile" placeholder="请输入联系方式" />
      </el-form-item>
      <el-form-item label="职称" prop="title">
        <el-input v-model="formData.title" placeholder="请输入职称" />
      </el-form-item>
      <el-form-item label="所属院系" prop="deptId">
        <DeptSelect v-model="formData.deptId" class="!w-1/1" placeholder="请选择院系" />
      </el-form-item>
      <el-form-item label="所带班级" prop="classNames">
        <el-select
          v-model="formData.classNames"
          multiple
          filterable
          allow-create
          default-first-option
          placeholder="请输入班级名称后回车新增"
          class="!w-1/1"
        >
          <el-option
            v-for="className in formData.classNames"
            :key="className"
            :label="className"
            :value="className"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="formData.status">
          <el-radio
            v-for="dict in getIntDictOptions(DICT_TYPE.COMMON_STATUS)"
            :key="dict.value"
            :value="dict.value"
          >
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input type="textarea" v-model="formData.remark" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="dialogVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { getIntDictOptions, DICT_TYPE } from '@/utils/dict'
import { CounselorApi, CounselorVO } from '@/api/edu/counselor'
import { CommonStatusEnum } from '@/utils/constants'
import DeptSelect from '@/views/system/dept/components/DeptSelect.vue'

defineOptions({ name: 'CounselorForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref<CounselorVO>({
  id: undefined,
  jobNo: undefined,
  name: undefined,
  gender: undefined,
  mobile: undefined,
  title: undefined,
  deptId: undefined,
  classNames: [],
  status: CommonStatusEnum.ENABLE,
  remark: undefined
})
const formRules = reactive({
  jobNo: [{ required: true, message: '工号不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }]
})
const formRef = ref() // 表单 Ref

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await CounselorApi.getCounselor(id)
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
  await formRef.value.validate()
  // 提交请求
  formLoading.value = true
  try {
    const data = formData.value
    if (formType.value === 'create') {
      await CounselorApi.createCounselor(data)
      message.success(t('common.createSuccess'))
    } else {
      await CounselorApi.updateCounselor(data)
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
  formData.value = {
    id: undefined,
    jobNo: undefined,
    name: undefined,
    gender: undefined,
    mobile: undefined,
    title: undefined,
    deptId: undefined,
    classNames: [],
    status: CommonStatusEnum.ENABLE,
    remark: undefined
  }
  formRef.value?.resetFields()
}
</script>
