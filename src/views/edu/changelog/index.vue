<!-- 变更日志列表 -->
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
      <el-form-item label="业务模块" prop="bizModule">
        <el-input
          v-model="queryParams.bizModule"
          placeholder="请输入业务模块"
          clearable
          @keyup.enter="handleQuery"
          class="!w-200px"
        />
      </el-form-item>
      <el-form-item label="业务编号" prop="bizNo">
        <el-input
          v-model="queryParams.bizNo"
          placeholder="请输入业务编号（如学号）"
          clearable
          @keyup.enter="handleQuery"
          class="!w-220px"
        />
      </el-form-item>
      <el-form-item label="业务名称" prop="bizName">
        <el-input
          v-model="queryParams.bizName"
          placeholder="请输入业务名称（如姓名）"
          clearable
          @keyup.enter="handleQuery"
          class="!w-220px"
        />
      </el-form-item>
      <el-form-item label="操作类型" prop="action">
        <el-select v-model="queryParams.action" placeholder="请选择操作类型" clearable class="!w-200px">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_CHANGE_LOG_ACTION)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="操作时间" prop="createTime">
        <el-date-picker
          v-model="queryParams.createTime"
          value-format="YYYY-MM-DD HH:mm:ss"
          type="datetimerange"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-240px"
        />
      </el-form-item>
      <el-form-item>
        <el-button @click="handleQuery"><Icon icon="ep:search" class="mr-5px" /> 搜索</el-button>
        <el-button @click="resetQuery"><Icon icon="ep:refresh" class="mr-5px" /> 重置</el-button>
        <el-button
          type="success"
          plain
          :loading="exportLoading"
          @click="handleExport"
          v-hasPermi="['edu:change-log:export']"
        >
          <Icon icon="ep:download" class="mr-5px" /> 导出
        </el-button>
      </el-form-item>
    </el-form>
  </ContentWrap>

  <!-- 列表 -->
  <ContentWrap>
    <el-table v-loading="loading" :data="list" :stripe="true" :show-overflow-tooltip="true">
      <el-table-column label="业务模块" align="center" prop="bizModule" width="120px" />
      <el-table-column label="业务编号" align="center" prop="bizNo" />
      <el-table-column label="业务名称" align="center" prop="bizName" />
      <el-table-column label="操作类型" align="center" prop="action" width="120px">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_CHANGE_LOG_ACTION" :value="scope.row.action" />
        </template>
      </el-table-column>
      <el-table-column label="变更字段" align="center" prop="fieldLabel" width="120px" />
      <el-table-column label="变更前" align="center" prop="beforeValue" />
      <el-table-column label="变更后" align="center" prop="afterValue" />
      <el-table-column label="操作人" align="center" prop="operatorName" width="120px" />
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column
        label="操作时间"
        align="center"
        prop="createTime"
        :formatter="dateFormatter"
        width="180px"
      />
    </el-table>
    <!-- 分页 -->
    <Pagination
      :total="total"
      v-model:page="queryParams.pageNo"
      v-model:limit="queryParams.pageSize"
      @pagination="getList"
    />
  </ContentWrap>
</template>

<script setup lang="ts">
import { dateFormatter } from '@/utils/formatTime'
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import download from '@/utils/download'
import { ChangeLogApi, ChangeLogVO } from '@/api/edu/changelog'

defineOptions({ name: 'EduChangeLog' })

const message = useMessage() // 消息弹窗

const loading = ref(true) // 列表的加载中
const list = ref<ChangeLogVO[]>([]) // 列表的数据
const total = ref(0) // 列表的总页数
const queryParams = reactive({
  pageNo: 1,
  pageSize: 10,
  bizModule: undefined,
  bizNo: undefined,
  bizName: undefined,
  action: undefined,
  createTime: undefined
})
const queryFormRef = ref() // 搜索的表单
const exportLoading = ref(false) // 导出的加载中

/** 查询列表 */
const getList = async () => {
  loading.value = true
  try {
    const data = await ChangeLogApi.getChangeLogPage(queryParams)
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

/** 导出按钮操作 */
const handleExport = async () => {
  try {
    // 导出的二次确认
    await message.exportConfirm()
    // 发起导出
    exportLoading.value = true
    const data = await ChangeLogApi.exportChangeLog(queryParams)
    download.excel(data, '变更日志.xlsx')
  } catch {
  } finally {
    exportLoading.value = false
  }
}

/** 初始化 **/
onMounted(() => {
  getList()
})
</script>
