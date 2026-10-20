<!-- 学期表单 -->
<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-form-item label="学期名称">
        <!-- 学期名称由「学院名称 + 学年 + 学期」自动拼装，只以纯文本展示 -->
        <span v-if="namePreview" class="text-14px">{{ namePreview }}</span>
        <span v-else class="text-14px text-gray-400">选择学年与学期后自动生成</span>
      </el-form-item>
      <el-form-item label="学年" prop="schoolYearStart">
        <div class="flex items-center gap-8px w-full">
          <!-- 双年份下拉：选定起始年份后，结束年份自动为起始年份 + 1 且禁选 -->
          <el-select
            v-model="formData.schoolYearStart"
            placeholder="起始年份"
            class="!w-1/2"
          >
            <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year" />
          </el-select>
          <span>—</span>
          <el-select
            v-model="formData.schoolYearEnd"
            placeholder="结束年份"
            class="!w-1/2"
            disabled
          >
            <el-option v-for="year in yearOptions" :key="year" :label="year" :value="year" />
          </el-select>
        </div>
      </el-form-item>
      <el-form-item label="学期" prop="term">
        <el-radio-group v-model="formData.term">
          <el-radio
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_SEMESTER_TERM)"
            :key="dict.value"
            :value="dict.value"
          >
            {{ dict.label }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="开始日期" prop="startDate">
        <el-date-picker
          v-model="formData.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择开始日期"
          class="!w-1/1"
          @change="handleStartDateChange"
        />
      </el-form-item>
      <el-form-item label="结束日期" prop="endDate">
        <!-- 条件禁用：开始日期未选择时不可选结束日期；结束日期不得早于或等于开始日期 -->
        <el-date-picker
          v-model="formData.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          :placeholder="formData.startDate ? '请选择结束日期' : '请先选择开始日期'"
          :disabled="!formData.startDate"
          :disabled-date="disabledEndDate"
          class="!w-1/1"
        />
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
import { SemesterApi, SemesterVO } from '@/api/edu/semester'

defineOptions({ name: 'SemesterForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const collegeName = ref('') // 学院名称（仅用于名称预览，最终以后端生成为准）
const formData = ref<SemesterVO>({
  id: undefined,
  schoolYearStart: undefined,
  schoolYearEnd: undefined,
  term: undefined,
  startDate: undefined,
  endDate: undefined,
  remark: undefined
})
const formRules = reactive({
  schoolYearStart: [{ required: true, message: '请选择学年起始年份', trigger: 'change' }],
  term: [{ required: true, message: '学期不能为空', trigger: 'change' }],
  startDate: [{ required: true, message: '开始日期不能为空', trigger: 'change' }],
  endDate: [
    { required: true, message: '结束日期不能为空', trigger: 'change' },
    {
      validator: (_rule: any, value: string, callback: any) => {
        // 结束日期必须晚于开始日期（不得小于等于）
        if (value && formData.value.startDate && value <= formData.value.startDate) {
          callback(new Error('结束日期必须晚于开始日期'))
          return
        }
        callback()
      },
      trigger: 'change'
    }
  ]
})
const formRef = ref() // 表单 Ref

/** 可选年份范围：当前年份前后各 10 年 */
const yearOptions = computed(() => {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let year = current - 10; year <= current + 10; year++) {
    years.push(year)
  }
  return years
})

/** 学期名称预览：学院名称 + 学年 + 学期 */
const namePreview = computed(() => {
  const { schoolYearStart, schoolYearEnd, term } = formData.value
  if (!schoolYearStart || !schoolYearEnd || !term) {
    return ''
  }
  const termName = getIntDictOptions(DICT_TYPE.EDU_SEMESTER_TERM).find(
    (dict) => dict.value === term
  )?.label
  return `${collegeName.value}${schoolYearStart}-${schoolYearEnd}学年${termName || ''}`
})

/** 结束年份随起始年份联动：始终为「起始年份 + 1」 */
watch(
  () => formData.value.schoolYearStart,
  (startYear) => {
    formData.value.schoolYearEnd = startYear ? startYear + 1 : undefined
  }
)

/** 结束日期禁用规则：不得早于或等于开始日期 */
const disabledEndDate = (date: Date) => {
  if (!formData.value.startDate) {
    return true
  }
  // 允许选择的最早日期为「开始日期 + 1 天」
  const start = new Date(formData.value.startDate + 'T00:00:00')
  return date.getTime() <= start.getTime()
}

/** 开始日期变化：若已选结束日期不再合法（<= 开始日期），清空重选 */
const handleStartDateChange = () => {
  if (formData.value.endDate && formData.value.endDate <= (formData.value.startDate || '')) {
    formData.value.endDate = undefined
  }
}

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 学院名称仅用于名称预览，获取失败不影响表单使用
  try {
    collegeName.value = await SemesterApi.getCollegeName()
  } catch {
    collegeName.value = ''
  }
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await SemesterApi.getSemester(id)
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
      await SemesterApi.createSemester(data)
      message.success(t('common.createSuccess'))
    } else {
      await SemesterApi.updateSemester(data)
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
    schoolYearStart: undefined,
    schoolYearEnd: undefined,
    term: undefined,
    startDate: undefined,
    endDate: undefined,
    remark: undefined
  }
  formRef.value?.resetFields()
}
</script>
