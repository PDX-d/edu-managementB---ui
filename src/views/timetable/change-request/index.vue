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
      <el-form-item label="课次 ID" prop="lessonId">
        <el-input
          v-model="queryParams.lessonId"
          placeholder="请输入课次 ID"
          clearable
          @keyup.enter="handleQuery"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item label="审批状态" prop="status">
        <el-select v-model="queryParams.status" placeholder="全部" clearable class="!w-240px">
          <el-option
            v-for="item in CHANGE_STATUS_OPTIONS"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list">
      <el-table-column label="类型" align="center" width="80">
        <template #default="{ row }">{{ CHANGE_TYPE_LABELS[row.type] || row.type }}</template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90">
        <template #default="{ row }"><ChangeStatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="原课次" align="center" min-width="220">
        <template #default="{ row }">
          <div>课次 {{ row.lessonId }}，教室 {{ row.originalClassroomId }}</div>
          <div>{{ formatBizRange(row.originalStartTime, row.originalEndTime) }}</div>
        </template>
      </el-table-column>
      <el-table-column label="目标安排" align="center" min-width="220">
        <template #default="{ row }">
          <template v-if="row.type === 'CHANGE'">
            <div>教室 {{ row.targetClassroomId }}</div>
            <div>{{ formatBizRange(row.targetStartTime, row.targetEndTime) }}</div>
          </template>
          <span v-else>停课</span>
        </template>
      </el-table-column>
      <el-table-column
        label="申请原因"
        align="center"
        prop="reason"
        min-width="160"
        :show-overflow-tooltip="true"
      />
      <el-table-column
        label="审批意见"
        align="center"
        min-width="160"
        :show-overflow-tooltip="true"
      >
        <template #default="{ row }">{{ row.reviewReason || '-' }}</template>
      </el-table-column>
      <el-table-column label="申请时间" align="center" width="170">
        <template #default="{ row }">{{ formatBizTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" align="center" width="180" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="detailRef.open(row.id)">详情</el-button>
          <template v-if="row.status === 0">
            <el-button
              link
              type="success"
              @click="reviewRef.open('approve', row.id)"
              v-hasPermi="['timetable:change-request:approve']"
            >
              通过
            </el-button>
            <el-button
              link
              type="danger"
              @click="reviewRef.open('reject', row.id)"
              v-hasPermi="['timetable:change-request:reject']"
            >
              拒绝
            </el-button>
          </template>
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

  <!-- 详情弹窗 -->
  <ChangeRequestDetail ref="detailRef" />
  <!-- 审批弹窗：成功或失败都按后端实际状态刷新 -->
  <ChangeReviewForm ref="reviewRef" @success="getList" @failed="getList" />
</template>
<script lang="ts" setup>
import * as ChangeRequestApi from '@/api/timetable/changeRequest'
import {
  CHANGE_STATUS_OPTIONS,
  CHANGE_TYPE_LABELS,
  formatBizRange,
  formatBizTime,
  idKey,
  isPositiveId,
  toIdValue
} from '../utils'
import ChangeStatusTag from './ChangeStatusTag.vue'
import ChangeRequestDetail from './ChangeRequestDetail.vue'
import ChangeReviewForm from './ChangeReviewForm.vue'

defineOptions({ name: 'TimetableChangeRequest' })

const message = useMessage() // 消息弹窗

const loading = ref(true) // 列表的加载中
const total = ref(0) // 列表的总页数
const list = ref<ChangeRequestApi.ChangeRequestVO[]>([]) // 列表的数据
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  lessonId: '',
  status: undefined as number | undefined
})
const queryFormRef = ref() // 搜索的表单
const detailRef = ref() // 详情弹窗
const reviewRef = ref() // 审批弹窗

/** 查询列表 */
const getList = async () => {
  const lessonId = idKey(queryParams.lessonId)
  if (lessonId && !isPositiveId(lessonId)) {
    message.warning('课次 ID 必须是正整数')
    loading.value = false
    return
  }
  loading.value = true
  try {
    const data = await ChangeRequestApi.getChangeRequestPage({
      pageNo: queryParams.pageNo,
      pageSize: queryParams.pageSize,
      lessonId: lessonId ? toIdValue(lessonId) : undefined,
      status: queryParams.status
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

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
