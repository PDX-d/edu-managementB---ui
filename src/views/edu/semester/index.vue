<!-- 学期管理列表 -->
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
      <el-form-item label="学期名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入学期名称"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="学年" prop="schoolYear">
        <el-input
          v-model="queryParams.schoolYear"
          placeholder="如 2025-2026"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="学期" prop="term">
        <el-select v-model="queryParams.term" placeholder="请选择学期" clearable class="!w-200px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_SEMESTER_TERM)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-200px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_SEMESTER_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
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
          v-hasPermi="['edu:semester:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="学期名称" align="center" prop="name" />
      <el-table-column label="学年" align="center" prop="schoolYear" />
      <el-table-column label="学期" align="center" prop="term">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_SEMESTER_TERM" :value="scope.row.term" />
        </template>
      </el-table-column>
      <el-table-column label="起止日期" align="center">
        <template #default="scope">
          {{ formatCellDate(scope.row.startDate) }} ~ {{ formatCellDate(scope.row.endDate) }}
        </template>
      </el-table-column>
      <el-table-column label="当前学期" align="center" prop="isCurrent">
        <template #header>
          <el-tooltip
            content="由起止日期与当前日期自动判定，无需人工设置：今天落在区间内即为当前学期"
            placement="top"
          >
            <span>当前学期</span>
          </el-tooltip>
        </template>
        <template #default="scope">
          <el-tag v-if="scope.row.isCurrent" type="success">当前</el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" prop="status">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_SEMESTER_STATUS" :value="scope.row.status" />
        </template>
      </el-table-column>
      <el-table-column label="归档" align="center" prop="archived" width="90px">
        <template #default="scope">
          <el-tag v-if="scope.row.archived" type="info">已归档</el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column
        label="创建时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" width="260">
        <template #default="scope">
          <el-button
            link
            type="primary"
            :disabled="scope.row.archived"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['edu:semester:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="warning"
            @click="openCalendar(scope.row)"
            v-hasPermi="['edu:semester:calendar:query']"
          >
            校历
          </el-button>
          <el-button
            link
            type="info"
            @click="handleArchive(scope.row)"
            v-hasPermi="['edu:semester:update']"
          >
            {{ scope.row.archived ? '取消归档' : '归档' }}
          </el-button>
          <el-button
            link
            type="danger"
            :disabled="scope.row.archived"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['edu:semester:delete']"
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
  <SemesterForm ref="formRef" @success="getList" />
  <!-- 校历弹窗 -->
  <SemesterCalendarDialog ref="calendarRef" />
</template>

<script setup lang="ts">
import { dateFormatter, formatDate } from '@/utils/formatTime'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { SemesterApi, SemesterVO } from '@/api/edu/semester'
import SemesterForm from './SemesterForm.vue'
import SemesterCalendarDialog from './SemesterCalendarDialog.vue'

defineOptions({ name: 'EduSemester' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

/** 表格单元格日期格式化（起止日期仅取日期部分） */
const formatCellDate = (value?: string) => formatDate(value || '', 'YYYY-MM-DD')

const loading = ref(true) // 列表的加载中
const list = ref<SemesterVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  schoolYear: undefined,
  term: undefined,
  status: undefined
})
const queryFormRef = ref() // 搜索的表单

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await SemesterApi.getSemesterPage(queryParams)
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
  handleQuery()
}

/** 添加/修改操作 */
const formRef = ref()
const openForm = (type: string, id?: number) => {
  formRef.value.open(type, id)
}

/** 打开校历（传入整条学期记录） */
const calendarRef = ref()
const openCalendar = (semester: SemesterVO) => {
  calendarRef.value.open(semester)
}

/** 归档 / 取消归档（归档后该学期只读） */
const handleArchive = async (semester: SemesterVO) => {
  const archived = !semester.archived
  try {
    await message.confirm(
      archived ? '归档后该学期及其校历将只读，确认归档吗？' : '确认取消归档吗？'
    )
    await SemesterApi.archiveSemester(semester.id!, archived)
    message.success(archived ? '归档成功' : '已取消归档')
    await getList()
  } catch {}
}

/** 删除按钮操作 */
const handleDelete = async (id: number) => {
  try {
    // 删除的二次确认
    await message.delConfirm()
    // 发起删除
    await SemesterApi.deleteSemester(id)
    message.success(t('common.delSuccess'))
    // 刷新列表
    await getList()
  } catch {}
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
