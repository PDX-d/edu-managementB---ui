<!-- 学生表单 -->
<template>
  <Dialog :title="dialogTitle" v-model="dialogVisible" width="720">
    <el-alert
      v-if="formType === 'create'"
      title="新增学生后，将自动创建登录账号：用户名 = 学号，密码 = 学号"
      type="info"
      :closable="false"
      show-icon
      class="mb-10px"
    />
    <el-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-width="100px"
      v-loading="formLoading"
    >
      <el-divider content-position="left">基本信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="学号" prop="studentNo">
            <el-input v-model="formData.studentNo" placeholder="请输入学号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="姓名" prop="name">
            <el-input v-model="formData.name" placeholder="请输入姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
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
        </el-col>
        <el-col :span="12">
          <el-form-item label="出生日期" prop="birthDate">
            <el-date-picker
              v-model="formData.birthDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择出生日期"
              :disabled-date="disabledFutureDate"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="身份证号" prop="idCard">
            <el-input v-model="formData.idCard" placeholder="请输入身份证号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="民族" prop="nation">
            <el-input v-model="formData.nation" placeholder="请输入民族" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="政治面貌" prop="politicalStatus">
            <el-select
              v-model="formData.politicalStatus"
              placeholder="请选择政治面貌"
              clearable
              class="!w-1/1"
            >
              <el-option
                v-for="dict in getIntDictOptions(DICT_TYPE.EDU_POLITICAL_STATUS)"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="籍贯" prop="nativePlace">
            <el-input v-model="formData.nativePlace" placeholder="请输入籍贯" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="年级" prop="gradeId">
            <el-select
              v-model="formData.gradeId"
              placeholder="请选择年级"
              clearable
              class="!w-1/1"
              @change="handleGradeChange"
            >
              <el-option
                v-for="item in gradeList"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="班级" prop="classId">
            <el-select v-model="formData.classId" placeholder="请选择班级" clearable class="!w-1/1">
              <el-option
                v-for="item in classList"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="专业" prop="majorId">
            <el-select
              v-model="formData.majorId"
              placeholder="请选择专业"
              clearable
              class="!w-1/1"
            >
              <el-option
                v-for="item in majorList"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="学制" prop="educationSystem">
            <el-select
              v-model="formData.educationSystem"
              placeholder="请选择学制"
              clearable
              class="!w-1/1"
            >
              <el-option
                v-for="dict in getIntDictOptions(DICT_TYPE.EDU_EDUCATION_SYSTEM)"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="入学年份" prop="enrollmentYear">
            <el-input-number v-model="formData.enrollmentYear" :min="2000" class="!w-1/1" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="入学日期" prop="admissionDate">
            <el-date-picker
              v-model="formData.admissionDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="请选择入学日期"
              :disabled-date="disabledAdmissionDate"
              class="!w-1/1"
              @change="handleAdmissionDateChange"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="毕业日期" prop="graduateDate">
            <!-- 默认禁用，仅当已填入学日期后才可用；且不可早于入学日期 -->
            <el-date-picker
              v-model="formData.graduateDate"
              type="date"
              value-format="YYYY-MM-DD"
              :placeholder="formData.admissionDate ? '请选择毕业日期' : '请先选择入学日期'"
              :disabled="!formData.admissionDate"
              :disabled-date="disabledGraduateDate"
              class="!w-1/1"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="所属院系" prop="deptId">
            <DeptSelect v-model="formData.deptId" class="!w-1/1" placeholder="请选择院系" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="宿舍" prop="dormitory">
            <el-input v-model="formData.dormitory" placeholder="请输入宿舍" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="手机号" prop="mobile">
            <el-input v-model="formData.mobile" placeholder="请输入手机号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="formData.email" placeholder="请输入邮箱" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="formData.status" placeholder="请选择状态" class="!w-1/1">
              <el-option
                v-for="dict in getIntDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)"
                :key="dict.value"
                :label="dict.label"
                :value="dict.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="标签" prop="tagIds">
            <el-select v-model="formData.tagIds" multiple placeholder="请选择标签" class="!w-1/1">
              <el-option
                v-for="item in enabledTagList"
                :key="item.id"
                :label="item.name"
                :value="item.id"
              />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">证件照片</el-divider>
      <el-row :gutter="20">
        <el-col :span="8">
          <el-form-item label="证件照" prop="photoUrl">
            <UploadImg v-model="formData.photoUrl" :height="'100px'" :width="'100px'" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="身份证正面" prop="idCardFrontUrl">
            <UploadImg v-model="formData.idCardFrontUrl" :height="'100px'" :width="'100px'" />
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="身份证反面" prop="idCardBackUrl">
            <UploadImg v-model="formData.idCardBackUrl" :height="'100px'" :width="'100px'" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">家庭信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="监护人姓名" prop="guardianName">
            <el-input v-model="formData.guardianName" placeholder="请输入监护人姓名" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="监护人手机号" prop="guardianMobile">
            <el-input v-model="formData.guardianMobile" placeholder="请输入监护人手机号" />
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="家庭地址" prop="address">
            <el-input v-model="formData.address" placeholder="请输入家庭地址" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="紧急联系人" prop="emergencyContact">
            <el-input v-model="formData.emergencyContact" placeholder="请输入紧急联系人" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="紧急联系电话" prop="emergencyMobile">
            <el-input v-model="formData.emergencyMobile" placeholder="请输入紧急联系电话" />
          </el-form-item>
        </el-col>
      </el-row>

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
import {
  StudentApi,
  StudentVO,
  StudentTagApi,
  StudentTagVO
} from '@/api/edu/student'
import DeptSelect from '@/views/system/dept/components/DeptSelect.vue'

defineOptions({ name: 'StudentForm' })

const { t } = useI18n() // 国际化
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const dialogTitle = ref('') // 弹窗的标题
const formLoading = ref(false) // 表单的加载中：1）修改时的数据加载；2）提交的按钮禁用
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const formData = ref<StudentVO>({
  id: undefined,
  studentNo: undefined,
  name: undefined,
  gender: undefined,
  birthDate: undefined,
  idCard: undefined,
  nation: undefined,
  politicalStatus: undefined,
  nativePlace: undefined,
  gradeId: undefined,
  classId: undefined,
  majorId: undefined,
  educationSystem: undefined,
  enrollmentYear: undefined,
  admissionDate: undefined,
  graduateDate: undefined,
  deptId: undefined,
  dormitory: undefined,
  mobile: undefined,
  email: undefined,
  status: 0,
  photoUrl: undefined,
  idCardFrontUrl: undefined,
  idCardBackUrl: undefined,
  guardianName: undefined,
  guardianMobile: undefined,
  address: undefined,
  emergencyContact: undefined,
  emergencyMobile: undefined,
  remark: undefined,
  tagIds: []
})
const formRules = reactive({
  studentNo: [{ required: true, message: '学号不能为空', trigger: 'blur' }],
  name: [{ required: true, message: '姓名不能为空', trigger: 'blur' }],
  status: [{ required: true, message: '状态不能为空', trigger: 'change' }],
  birthDate: [{ required: true, message: '出生日期不能为空', trigger: 'change' }]
})
const formRef = ref() // 表单 Ref

const gradeList = ref<any[]>([]) // 年级列表
const classList = ref<any[]>([]) // 班级列表
// 专业列表（数据源为专业表 dict_major，通过 gradeId 联动）
// TODO: 字典中心模块待接入
const majorList = ref<any[]>([])
const tagList = ref<StudentTagVO[]>([]) // 标签列表
// 表单下拉只展示「启用中」且有编号的标签（status = 1 表示停用）
const enabledTagList = computed(() =>
  tagList.value.filter(
    (tag): tag is StudentTagVO & { id: number } => tag.status !== 1 && tag.id != null
  )
)

/** 出生日期上限为今天：禁止选择未来日期（后端 @PastOrPresent 二次校验） */
const disabledFutureDate = (date: Date) => {
  return date.getTime() > Date.now()
}

/** 将 'YYYY-MM-DD' 解析为本地零点时间戳，避免 new Date(str) 的 UTC 时区偏移 */
const toLocalTime = (dateStr?: string) => {
  if (!dateStr) {
    return undefined
  }
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
}

/** 毕业日期不可早于入学日期 */
const disabledGraduateDate = (date: Date) => {
  const admissionTime = toLocalTime(formData.value.admissionDate)
  return admissionTime !== undefined && date.getTime() < admissionTime
}

/** 入学日期不可晚于毕业日期（与上一条互为约束） */
const disabledAdmissionDate = (date: Date) => {
  const graduateTime = toLocalTime(formData.value.graduateDate)
  return graduateTime !== undefined && date.getTime() > graduateTime
}

/** 入学日期变更（含清空）时，联动清空毕业日期，避免残留比入学更早的历史值 */
const handleAdmissionDateChange = () => {
  formData.value.graduateDate = undefined
}

/** 打开弹窗 */
const open = async (type: string, id?: number) => {
  dialogVisible.value = true
  dialogTitle.value = t('action.' + type)
  formType.value = type
  resetForm()
  // 加载年级、标签列表
  gradeList.value = await StudentApi.getGradeList()
  tagList.value = await StudentTagApi.getTagList()
  // 修改时，设置数据
  if (id) {
    formLoading.value = true
    try {
      formData.value = await StudentApi.getStudent(id)
      formData.value.tagIds = formData.value.tags?.map((tag) => tag.id!) ?? []
      // 修改时加载对应班级、专业列表
      if (formData.value.gradeId) {
        classList.value = await StudentApi.getClassList(formData.value.gradeId)
        majorList.value = await StudentApi.getMajorList(formData.value.gradeId)
      }
    } finally {
      formLoading.value = false
    }
  }
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 年级变化时重新加载班级、专业列表，并清空已选值 */
const handleGradeChange = async (gradeId?: number) => {
  formData.value.classId = undefined
  formData.value.majorId = undefined
  classList.value = gradeId ? await StudentApi.getClassList(gradeId) : []
  majorList.value = gradeId ? await StudentApi.getMajorList(gradeId) : []
}

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
      await StudentApi.createStudent(data)
      message.success(t('common.createSuccess'))
    } else {
      await StudentApi.updateStudent(data)
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
    studentNo: undefined,
    name: undefined,
    gender: undefined,
    birthDate: undefined,
    idCard: undefined,
    nation: undefined,
    politicalStatus: undefined,
    nativePlace: undefined,
    gradeId: undefined,
    classId: undefined,
    majorId: undefined,
    educationSystem: undefined,
    enrollmentYear: undefined,
    admissionDate: undefined,
    graduateDate: undefined,
    deptId: undefined,
    dormitory: undefined,
    mobile: undefined,
    email: undefined,
    status: 0,
    photoUrl: undefined,
    guardianName: undefined,
    guardianMobile: undefined,
    address: undefined,
    emergencyContact: undefined,
    emergencyMobile: undefined,
    remark: undefined,
    tagIds: []
  }
  classList.value = []
  majorList.value = []
  formRef.value?.resetFields()
}
</script>
