<template>
  <!-- 搜索 -->
  <ContentWrap>
    <el-form
      class="-mb-15px"
      :model="queryParams"
      ref="queryFormRef"
      :inline="true"
      label-width="68px"
    >
      <el-form-item label="教室名称" prop="name">
        <el-input
          v-model="queryParams.name"
          placeholder="请输入教室名称"
          clearable
          maxlength="128"
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="请选择状态" clearable class="!w-240px">
          <el-option
            v-for="item in CLASSROOM_STATUS_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
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
          v-hasPermi="['timetable:classroom:create']"
        >
          <Icon icon="ep:plus" class="mr-5px" /> 新增
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="教室编号" align="center" prop="code" />
      <el-table-column label="教室名称" align="center" prop="name" :show-overflow-tooltip="true" />
      <el-table-column label="位置" align="center" prop="location" :show-overflow-tooltip="true" />
      <el-table-column label="容量" align="center" prop="capacity" width="100" />
      <el-table-column label="状态" align="center" prop="status" width="100">
        <template #default="scope">
          <el-tag :type="scope.row.status === 0 ? 'success' : 'info'">
            {{ scope.row.status === 0 ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="240">
        <template #default="scope">
          <el-button link type="primary" @click="detailRef.open(scope.row.id)">详情</el-button>
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row.id)"
            v-hasPermi="['timetable:classroom:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            :type="scope.row.status === 0 ? 'warning' : 'success'"
            @click="handleStatusChange(scope.row, scope.row.status === 0 ? 1 : 0)"
            v-hasPermi="['timetable:classroom:update']"
          >
            {{ scope.row.status === 0 ? '停用' : '启用' }}
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row)"
            v-hasPermi="['timetable:classroom:delete']"
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
  <ClassroomForm ref="formRef" @success="getList" />
  <!-- 详情弹窗 -->
  <ClassroomDetail ref="detailRef" />
</template>
<script lang="ts" setup>
import * as ClassroomApi from '@/api/timetable/classroom'
import type { TimetableId } from '@/api/timetable/types'
import { CLASSROOM_STATUS_OPTIONS } from '../utils'
import ClassroomForm from './ClassroomForm.vue'
import ClassroomDetail from './ClassroomDetail.vue'

defineOptions({ name: 'TimetableClassroom' })

const message = useMessage() // 消息弹窗
const { t } = useI18n() // 国际化

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<ClassroomApi.ClassroomVO[]>([]) // 列表的数据
const queryParams = reactive<ClassroomApi.ClassroomPageReqVO>({
  pageNo: 1,
  pageSize: 10,
  name: undefined,
  status: undefined
})
const queryFormRef = ref() // 搜索的表单
const detailRef = ref() // 详情弹窗

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ClassroomApi.getClassroomPage({
      ...queryParams,
      name: queryParams.name?.trim() || undefined
    })
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
const openForm = (type: string, id?: TimetableId) => {
  formRef.value.open(type, id)
}

/** 停用 / 启用：基于最新详情只修改状态 */
const updateStatus = async (id: TimetableId, status: number) => {
  const latest = await ClassroomApi.getClassroom(id)
  await ClassroomApi.updateClassroom({
    id: latest.id,
    code: latest.code,
    name: latest.name,
    location: latest.location,
    capacity: latest.capacity,
    status
  })
}

const handleStatusChange = async (row: ClassroomApi.ClassroomVO, status: number) => {
  const text = status === 1 ? '停用' : '启用'
  try {
    await message.confirm(`确认要${text}教室“${row.name}”吗？`)
  } catch {
    return
  }
  try {
    await updateStatus(row.id, status)
    message.success(`${text}成功`)
  } catch {
    // 错误信息已由请求封装提示
  } finally {
    await getList()
  }
}

/** 删除按钮操作：被引用的教室后端会拒绝删除，此时引导改为停用 */
const handleDelete = async (row: ClassroomApi.ClassroomVO) => {
  try {
    await message.delConfirm()
  } catch {
    return
  }
  try {
    await ClassroomApi.deleteClassroom(row.id)
    message.success(t('common.delSuccess'))
    await getList()
    return
  } catch {
    // 后端错误信息已由请求封装提示，下面只做引导
  }
  if (row.status !== 0) {
    message.alertWarning('已被课次或调停课申请引用的教室不能删除，只能保持停用状态。')
    return
  }
  try {
    await message.confirm(
      '已被课次或调停课申请引用的教室不能删除，只能停用。是否改为停用该教室？',
      '删除失败'
    )
  } catch {
    return
  }
  try {
    await updateStatus(row.id, 1)
    message.success('停用成功')
  } catch {
  } finally {
    await getList()
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
