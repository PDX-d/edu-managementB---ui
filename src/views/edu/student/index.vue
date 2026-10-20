<!-- 学生管理列表 -->
<template>
  <ContentWrap>
    <!-- 搜索工作栏 -->
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="学号" prop="studentNo">
        <el-input
          v-model="queryParams.studentNo"
          placeholder="请输入学号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="姓名" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入姓名"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="性别" prop="gender">
        <el-select v-model="queryParams.gender" placeholder="请选择性别" clearable class="!w-200px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.SYSTEM_USER_SEX)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
          <!-- 装饰项：禁用选择，不参与查询 -->
          <el-option label="🛒 沃尔玛购物袋" value="__easter_egg__" disabled />
        </el-select>
      </el-form-item>
      <el-form-item label="年级" prop="gradeId">
        <el-select
          v-model="queryParams.gradeId"
          placeholder="请选择年级"
          clearable
          class="!w-200px"
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
      <el-form-item label="班级" prop="classId">
        <el-select v-model="queryParams.classId" placeholder="请选择班级" clearable class="!w-200px">
          <el-option
            v-for="item in classList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="所属院系" prop="deptId">
        <DeptSelect v-model="queryParams.deptId" class="!w-240px" placeholder="请选择院系" />
      </el-form-item>
      <el-form-item label="政治面貌" prop="politicalStatus">
        <el-select
          v-model="queryParams.politicalStatus"
          placeholder="请选择政治面貌"
          clearable
          class="!w-200px"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_POLITICAL_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="入学年份" prop="enrollmentYear">
        <el-input-number
          v-model="queryParams.enrollmentYear"
          placeholder="请输入入学年份"
          :controls="false"
          :min="1900"
          :max="2100"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="手机号" prop="mobile">
        <el-input
          v-model="queryParams.mobile"
          placeholder="请输入手机号"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-200px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="标签" prop="tagId">
        <el-select v-model="queryParams.tagId" placeholder="请选择标签" clearable class="!w-200px">
          <el-option
            v-for="item in enabledTagList"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="primary"
          plain
          @click="openForm('create')"
          v-hasPermi="['edu:student:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
        <el-button
          type="warning"
          plain
          @click="handleImport"
          v-hasPermi="['edu:student:import']"
        >
          <Icon icon="ep:upload" class="mr-5px" /> 导入
        </el-button>
        <el-button
          type="success"
          plain
          :loading="exportLoading"
          @click="handleExport"
          v-hasPermi="['edu:student:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
        <el-button
          type="info"
          plain
          @click="handleTag"
          v-hasPermi="['edu:student:tag:query']"
        >
          <Icon icon="ep:collection-tag" class="mr-5px" /> 标签管理
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="学号" align="center" prop="studentNo" />
      <el-table-column label="姓名" align="center" prop="name" />
      <el-table-column label="性别" align="center" prop="gender">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.SYSTEM_USER_SEX" :value="scope.row.gender" />
        </template>
      </el-table-column>
      <el-table-column label="政治面貌" align="center" prop="politicalStatus">
        <template #default="scope">
          <dict-tag
            :type="DICT_TYPE.EDU_POLITICAL_STATUS"
            :value="scope.row.politicalStatus"
          />
        </template>
      </el-table-column>
      <el-table-column label="年级" align="center" prop="gradeName" />
      <el-table-column label="班级" align="center" prop="className" />
      <el-table-column label="专业" align="center" prop="majorName" />
      <el-table-column label="标签" align="center" prop="tags">
        <template #default="scope">
          <el-tag
            v-for="tag in scope.row.tags"
            :key="tag.id"
            :color="tag.color"
            class="mr-5px"
            effect="dark"
          >
            {{ tag.name }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_STUDENT_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="手机号" align="center" prop="mobile" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" width="180">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['edu:student:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="warning"
            @click="openChange(scope.row.id)"
            v-hasPermi="['edu:student:query']"
          >
            变更
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['edu:student:delete']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>

  <!-- 表单弹窗：添加/修改 -->
  <StudentForm ref="formRef" @success="getList" />
  <!-- 标签管理弹窗 -->
  <StudentTagDialog ref="tagRef" @success="getList" />
  <!-- 变更记录弹窗 -->
  <StudentChangeDialog ref="changeRef" />
  <!-- 导入弹窗 -->
  <StudentImportForm ref="importFormRef" @success="getList" />
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import download from '@/utils/download'
import { StudentApi, StudentVO, StudentTagApi, StudentTagVO } from '@/api/edu/student'
import StudentForm from './StudentForm.vue'
import StudentTagDialog from './StudentTagDialog.vue'
import StudentChangeDialog from './StudentChangeDialog.vue'
import StudentImportForm from './StudentImportForm.vue'
import DeptSelect from '@/views/system/dept/components/DeptSelect.vue'

defineOptions({ name: 'EduStudent' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const list = ref<StudentVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  studentNo: undefined,
  name: undefined,
  gender: undefined,
  gradeId: undefined,
  classId: undefined,
  deptId: undefined,
  politicalStatus: undefined,
  enrollmentYear: undefined,
  mobile: undefined,
  status: undefined,
  tagId: undefined
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

const gradeList = ref<any[]>([]) // 年级列表
const classList = ref<any[]>([]) // 班级列表
const tagList = ref<StudentTagVO[]>([]) // 标签列表（用于按标签筛选）
// 筛选下拉只展示「启用中」且有编号的标签（status = 1 表示停用）
const enabledTagList = computed(() =>
  tagList.value.filter(
    (tag): tag is StudentTagVO & { id: number } => tag.status !== 1 && tag.id != null
  )
)

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await StudentApi.getStudentPage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

/** 搜索按钮操作 */
const handleQuery = () => {
  queryParams.pageNo = 1
  getList()
}

/** 重置按钮操作 */
const resetQuery = () => {
  queryFormRef.value.resetFields()
  queryParams.deptId = undefined
  classList.value = []
  handleQuery()
}

/** 获得年级列表 */
const getGradeList = async () => {
  gradeList.value = await StudentApi.getGradeList()
}

/** 获得标签列表（用于按标签筛选） */
const getTagList = async () => {
  tagList.value = await StudentTagApi.getTagList()
}

/** 年级变化时加载班级列表 */
const handleGradeChange = async (gradeId?: number) => {
  queryParams.classId = undefined
  classList.value = gradeId ? await StudentApi.getClassList(gradeId) : []
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 标签管理操作 */
const tagRef = ref()
const handleTag = () => {
  tagRef.value.open()
}

/** 变更记录操作 */
const changeRef = ref()
const openChange = (studentId: number) => {
  changeRef.value.open(studentId)
}

/** 导入按钮操作 */
const importFormRef = ref()
const handleImport = () => {
  importFormRef.value.open()
}

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await StudentApi.exportStudent(queryParams)
    download.excel(data, '学生.xlsx')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await StudentApi.deleteStudent(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 初始化 **/
onMounted(() => {
  getList()
  getGradeList()
  getTagList()
})
</script>
