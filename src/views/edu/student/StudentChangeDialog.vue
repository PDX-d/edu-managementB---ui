<!-- 学生变更记录弹窗 -->
<template>
  <Dialog v-model="dialogVisible" title="学生变更记录" width="900">
    <div class="mb-10px">
      <el-button
        type="primary"
        plain
        @click="openApplyForm"
        v-hasPermi="['edu:student:update']"
      >
        <Icon icon="ep:plus" class="mr-5px" /> 新增变更申请
      </el-button>
    </div>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="变更类型" align="center" prop="changeType" width="120px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_STUDENT_CHANGE_TYPE" :value="scope.row.changeType" />
        </template>
      </el-table-column>
      <el-table-column label="原值" align="center" prop="fromValue" />
      <el-table-column label="新值" align="center" prop="toValue" />
      <el-table-column label="原因" align="center" prop="reason" />
      <el-table-column label="审批状态" align="center" prop="approvalStatus" width="110px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_APPROVAL_STATUS" :value="scope.row.approvalStatus" />
        </template>
      </el-table-column>
      <el-table-column
        label="审批时间"
        align="center"
        prop="approveTime"
        :formatter="dateFormatter"
        width="180px"
      />
      <el-table-column label="操作" align="center" width="150px">
        <template #default="scope">
          <el-button
            v-if="scope.row.approvalStatus === 1"
            link
            type="primary"
            @click="openApproveForm(scope.row)"
            v-hasPermi="['edu:student:update']"
          >
            审批
          </el-button>
          <el-button link type="info" @click="openTimeline(scope.row)">查看进度</el-button>
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
    <template #footer>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </Dialog>

  <!-- 新增变更申请弹窗 -->
  <Dialog v-model="applyVisible" title="新增变更申请" width="500" append-to-body>
    <el-form ref="applyFormRef" :model="applyForm" :rules="applyRules" label-width="90px">
      <el-form-item label="变更类型" prop="changeType">
        <el-select
          v-model="applyForm.changeType"
          placeholder="请选择变更类型"
          class="!w-1/1"
          @change="handleChangeTypeChange"
        >
          <el-option
            v-for="dict in changeTypeOptions"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <!-- 调班入口暂不开放 -->
      <el-form-item>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="调班功能由后续人员开发，敬请期待；如需变更学籍状态或复学，请在上方选择对应类型。"
        />
      </el-form-item>
      <el-form-item label="原值" prop="fromValue">
        <el-select
          v-if="isClassChange"
          v-model="applyForm.fromValue"
          placeholder="请选择原班级"
          clearable
          class="!w-1/1"
        >
          <el-option
            v-for="item in classList"
            :key="item.id"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
        <el-select
          v-else
          v-model="applyForm.fromValue"
          placeholder="请选择原学籍状态"
          clearable
          class="!w-1/1"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="String(dict.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item v-if="isResume" label="新值">
        <el-tag type="success">复学 → 学籍恢复为「在读」</el-tag>
      </el-form-item>
      <el-form-item v-else label="新值" prop="toValue">
        <el-select
          v-if="isClassChange"
          v-model="applyForm.toValue"
          placeholder="请选择新班级"
          clearable
          class="!w-1/1"
        >
          <el-option
            v-for="item in classList"
            :key="item.id"
            :label="item.name"
            :value="String(item.id)"
          />
        </el-select>
        <el-select
          v-else
          v-model="applyForm.toValue"
          placeholder="请选择新学籍状态"
          clearable
          class="!w-1/1"
        >
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_STUDENT_STATUS)"
            :key="dict.value"
            :label="dict.label"
            :value="String(dict.value)"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="变更原因" prop="reason">
        <el-input type="textarea" v-model="applyForm.reason" placeholder="请输入变更原因" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitApply" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="applyVisible = false">取 消</el-button>
    </template>
  </Dialog>

  <!-- 审批弹窗 -->
  <Dialog v-model="approveVisible" title="变更审批" width="500" append-to-body>
    <el-form ref="approveFormRef" :model="approveForm" :rules="approveRules" label-width="90px">
      <el-form-item label="审批结果" prop="approvalStatus">
        <el-radio-group v-model="approveForm.approvalStatus">
          <el-radio :value="2">通过</el-radio>
          <el-radio :value="3">驳回</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="审批意见" prop="approveRemark">
        <el-input type="textarea" v-model="approveForm.approveRemark" placeholder="请输入审批意见" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="approveVisible = false">取 消</el-button>
      <el-button @click="submitApprove" type="primary" :disabled="formLoading">确 定</el-button>
    </template>
  </Dialog>

  <!-- 审批进度时间线 -->
  <Dialog v-model="timelineVisible" title="审批进度" width="560" append-to-body>
    <template v-if="currentRecord">
      <div class="mb-15px">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="变更类型">
            <dict-tag
              :type="DICT_TYPE.EDU_STUDENT_CHANGE_TYPE"
              :value="currentRecord.changeType ?? ''"
            />
          </el-descriptions-item>
          <el-descriptions-item label="审批状态">
            <dict-tag
              :type="DICT_TYPE.EDU_APPROVAL_STATUS"
              :value="currentRecord.approvalStatus ?? ''"
            />
          </el-descriptions-item>
          <el-descriptions-item label="原值">
            {{ currentRecord.fromValue || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="新值">
            {{ currentRecord.toValue || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="变更原因" :span="2">
            {{ currentRecord.reason || '—' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <el-timeline>
        <el-timeline-item
          v-for="(node, index) in timelineNodes"
          :key="index"
          :type="node.type"
          :timestamp="node.timestamp"
          :hollow="node.hollow"
          placement="top"
        >
          <div class="font-bold">{{ node.title }}</div>
          <div v-if="node.content" class="mt-4px text-13px text-gray-600">
            {{ node.content }}
          </div>
        </el-timeline-item>
      </el-timeline>
      <el-alert
        v-if="!currentRecord.processInstanceId"
        type="info"
        :closable="false"
        show-icon
        title="本次变更走「轻量审批」：流程模型 edu-student-change 尚未发布，审批在变更记录中直接处理。"
      />
    </template>
    <template #footer>
      <el-button @click="timelineVisible = false">关 闭</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { StudentApi, StudentChangeApi, StudentChangeRecordVO } from '@/api/edu/student'

defineOptions({ name: 'StudentChangeDialog' })

const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const loading = ref(false) // 列表的加载中
const list = ref<StudentChangeRecordVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const studentId = ref<number>() // 当前学生编号
const formLoading = ref(false) // 表单提交的加载中
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  studentId: undefined as number | undefined
})

/** 打开弹窗 */
const open = async (id: number) => {
  studentId.value = id
  queryParams.studentId = id
  queryParams.pageNo = 1
  dialogVisible.value = true
  await getList()
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 查询变更记录列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await StudentChangeApi.getChangePage(queryParams)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

// ==================== 新增变更申请 ====================
const applyVisible = ref(false) // 申请弹窗是否展示
const applyFormRef = ref() // 申请表单 Ref
const applyForm = ref<StudentChangeRecordVO>({
  changeType: undefined,
  fromValue: undefined,
  toValue: undefined,
  reason: undefined
})
const classList = ref<any[]>([]) // 班级列表（调班时用于选择原/新班级）
// 变更类型：1=学籍状态变更 / 2=调班 / 3=复学
const isClassChange = computed(() => applyForm.value.changeType === 2)
const isResume = computed(() => applyForm.value.changeType === 3)
// 变更类型选项：隐藏「调班(2)」入口，其余类型正常可选
const changeTypeOptions = computed(() =>
  getIntDictOptions(DICT_TYPE.EDU_STUDENT_CHANGE_TYPE).filter((dict) => dict.value !== 2)
)
const applyRules = reactive({
  changeType: [{ required: true, message: '变更类型不能为空', trigger: 'change' }],
  toValue: [{ required: true, message: '新值不能为空', trigger: 'change' }],
  reason: [{ required: true, message: '变更原因不能为空', trigger: 'blur' }]
})

/** 变更类型变化：清空原值/新值，调班时加载班级列表 */
const handleChangeTypeChange = async () => {
  applyForm.value.fromValue = undefined
  applyForm.value.toValue = undefined
  if (isClassChange.value) {
    classList.value = await StudentApi.getClassList()
  }
}

/** 打开变更申请表单 */
const openApplyForm = async () => {
  applyVisible.value = true
  applyForm.value = {
    changeType: undefined,
    fromValue: undefined,
    toValue: undefined,
    reason: undefined
  }
  applyFormRef.value?.clearValidate()
}

/** 提交变更申请 */
const submitApply = async () => {
  await applyFormRef.value.validate()
  formLoading.value = true
  try {
    await StudentChangeApi.createChange({ ...applyForm.value, studentId: studentId.value })
    message.success('提交成功')
    applyVisible.value = false
    await getList()
  } finally {
    formLoading.value = false
  }
}

// ==================== 审批 ====================
const approveVisible = ref(false) // 审批弹窗是否展示
const approveFormRef = ref() // 审批表单 Ref
const approveForm = ref<StudentChangeRecordVO>({
  id: undefined,
  approvalStatus: 2,
  approveRemark: undefined
})
const approveRules = reactive({
  approvalStatus: [{ required: true, message: '审批结果不能为空', trigger: 'change' }]
})

/** 打开审批表单 */
const openApproveForm = (row: StudentChangeRecordVO) => {
  approveVisible.value = true
  approveForm.value = {
    id: row.id,
    approvalStatus: 2,
    approveRemark: undefined
  }
  approveFormRef.value?.clearValidate()
}

/** 提交审批 */
const submitApprove = async () => {
  await approveFormRef.value.validate()
  formLoading.value = true
  try {
    await StudentChangeApi.approveChange(approveForm.value)
    message.success('审批成功')
    approveVisible.value = false
    await getList()
  } finally {
    formLoading.value = false
  }
}

// ==================== 审批进度时间线 ====================
const timelineVisible = ref(false) // 时间线弹窗是否展示
const currentRecord = ref<StudentChangeRecordVO>() // 当前查看的记录

/** 时间格式化（后端返回 LocalDateTime，统一取 yyyy-MM-dd HH:mm:ss） */
const formatTime = (value?: Date | string) => (value ? dateFormatter(undefined as any, undefined as any, value as any) : '')

/**
 * 由变更记录推导时间线节点：提交申请 → 审批节点（待审批 / 通过 / 驳回）
 *
 * 单级审批，时间线固定为两到三个节点；后续接入 BPM 后（processInstanceId 非空）可改为渲染多级节点。
 */
const timelineNodes = computed(() => {
  const record = currentRecord.value
  if (!record) {
    return []
  }
  // 时间线节点类型与 el-timeline-item 的 type 取值保持一致
  const nodes: {
    title: string
    content?: string
    timestamp: string
    type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    hollow?: boolean
  }[] = [
    {
      title: '提交变更申请',
      content: `变更原因：${record.reason || '—'}`,
      timestamp: formatTime(record.createTime),
      type: 'primary'
    }
  ]
  if (record.approvalStatus === 1) {
    nodes.push({
      title: '待审批',
      content: '等待具有审批权限的人员处理',
      timestamp: '',
      type: 'warning',
      hollow: true
    })
  } else if (record.approvalStatus === 2) {
    nodes.push({
      title: '审批通过',
      content: `审批意见：${record.approveRemark || '—'}`,
      timestamp: formatTime(record.approveTime),
      type: 'success'
    })
  } else if (record.approvalStatus === 3) {
    nodes.push({
      title: '已驳回',
      content: `审批意见：${record.approveRemark || '—'}`,
      timestamp: formatTime(record.approveTime),
      type: 'danger'
    })
  } else {
    nodes.push({
      title: '草稿',
      content: '尚未提交审批',
      timestamp: '',
      type: 'info',
      hollow: true
    })
  }
  return nodes
})

/** 打开审批进度 */
const openTimeline = (row: StudentChangeRecordVO) => {
  currentRecord.value = row
  timelineVisible.value = true
}
</script>
