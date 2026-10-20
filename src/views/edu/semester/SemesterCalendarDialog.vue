<!-- 学期校历管理弹窗 -->
<template>
  <Dialog v-model="dialogVisible" title="校历管理" width="820">
    <!-- 校历可视化：按月份展示，节点按固定色板着色；仅在学期起止区间内可编辑 -->
    <div class="mb-15px">
      <div class="mb-8px text-14px font-bold">
        {{ semesterTitle }}
        <span class="ml-10px text-12px font-normal text-gray-500">
          可编辑区间：{{ semesterStart || '未设置' }} ~ {{ semesterEnd || '未设置' }}
        </span>
      </div>
      <el-calendar v-model="calendarDate" class="edu-semester-calendar">
        <!-- 自定义头部：标题按当前展示月份自行拼装，翻月按钮超出学期区间时禁用 -->
        <template #header>
          <div class="cal-header">
            <span class="cal-header-month">{{ calendarTitle }}</span>
            <div class="cal-header-nav">
              <el-button size="small" :disabled="!canPrevMonth" @click="prevMonth">上月</el-button>
              <el-button size="small" :disabled="!canNextMonth" @click="nextMonth">下月</el-button>
            </div>
          </div>
        </template>
        <template #date-cell="{ data }">
          <div
            class="cal-cell"
            :class="{ 'is-disabled': !isEditableDay(data.day), 'is-editable': isEditableDay(data.day) }"
            :title="isEditableDay(data.day) ? '点击可新增该日校历节点' : '超出学期起止日期，不可编辑'"
            @click="handleCellClick(data.day)"
          >
            <div class="cal-day">{{ dayOfMonth(data.day) }}</div>
            <div v-if="shouldShowWeek(data.day)" class="cal-week">第{{ weekNoOfDay(data.day) }}周</div>
            <el-tag
              v-for="node in nodesOfDay(data.day)"
              :key="node.id"
              size="small"
              effect="dark"
              :color="node.color || undefined"
              class="cal-node-tag"
            >
              {{ node.name }}
            </el-tag>
          </div>
        </template>
      </el-calendar>
    </div>
    <div class="mb-10px">
      <el-button
        type="primary"
        plain
        @click="openForm('create')"
        v-hasPermi="['edu:semester:calendar:create']"
      >
        <Icon icon="ep:plus" class="mr-5px" /> 新增节点
      </el-button>
      <span class="ml-10px text-12px text-gray-500">
        提示：可直接点击校历中的某一天，快速新增该日（单日）节点
      </span>
    </div>
    <el-table v-loading="loading" :data="list" :stripe="true">
      <el-table-column label="节点名称" align="center" prop="name" />
      <el-table-column label="类型" align="center" prop="type">
        <template #default="scope">
          <dict-tag :type="DICT_TYPE.EDU_SEMESTER_CALENDAR_TYPE" :value="scope.row.type" />
        </template>
      </el-table-column>
      <el-table-column label="开始日期" align="center" prop="startDate" width="120px" />
      <el-table-column label="结束日期" align="center" prop="endDate" width="120px">
        <template #default="scope">
          <span>{{ scope.row.endDate || '（单日）' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="周次" align="center" prop="weekNo" width="80px">
        <template #default="scope">
          <span v-if="scope.row.weekNo">第{{ scope.row.weekNo }}周</span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="颜色" align="center" prop="color" width="90px">
        <template #default="scope">
          <span
            v-if="scope.row.color"
            :style="{ display: 'inline-block', width: '18px', height: '18px', backgroundColor: scope.row.color, borderRadius: '3px' }"
          ></span>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="操作" align="center" width="130">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row)"
            v-hasPermi="['edu:semester:calendar:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['edu:semester:calendar:delete']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </Dialog>

  <!-- 校历节点表单弹窗 -->
  <Dialog v-model="formVisible" :title="formTitle" width="500" append-to-body>
    <el-form ref="nodeFormRef" :model="nodeForm" :rules="nodeRules" label-width="90px">
      <el-form-item label="节点名称" prop="name">
        <el-input v-model="nodeForm.name" placeholder="请输入节点名称" />
      </el-form-item>
      <el-form-item label="类型" prop="type">
        <el-select v-model="nodeForm.type" placeholder="请选择类型" class="!w-1/1">
          <el-option
            v-for="dict in getIntDictOptions(DICT_TYPE.EDU_SEMESTER_CALENDAR_TYPE)"
            :key="dict.value"
            :label="dict.label"
            :value="dict.value"
          />
        </el-select>
      </el-form-item>
      <el-form-item label="开始日期" prop="startDate">
        <!-- 条件禁用：仅允许选择学期起止区间内的日期 -->
        <el-date-picker
          v-model="nodeForm.startDate"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="请选择开始日期"
          :disabled-date="disabledNodeDate"
          class="!w-1/1"
          @change="handleNodeStartDateChange"
        />
      </el-form-item>
      <el-form-item label="结束日期" prop="endDate">
        <!-- 条件禁用：仅允许学期区间内日期；留空表示单日节点 -->
        <el-date-picker
          v-model="nodeForm.endDate"
          type="date"
          value-format="YYYY-MM-DD"
          :placeholder="nodeForm.startDate ? '留空表示单日（仅当天）' : '请先选择开始日期'"
          :disabled="!nodeForm.startDate"
          :disabled-date="disabledNodeEndDate"
          class="!w-1/1"
        />
      </el-form-item>
      <el-form-item label="周次" prop="weekNo">
        <!-- 周次按开始日期自动推导（学期开始日期为第 1 周起点），可人工微调 -->
        <el-input-number v-model="nodeForm.weekNo" :min="1" class="!w-1/1" />
      </el-form-item>
      <el-form-item label="颜色" prop="color">
        <!-- 与标签同款固定 16 色，只可选不可输入 -->
        <div class="flex flex-wrap gap-8px">
          <div
            v-for="option in COLOR_OPTIONS"
            :key="option.color"
            class="color-swatch"
            :class="{ 'is-active': nodeForm.color === option.color }"
            :style="{ backgroundColor: option.color }"
            :title="option.name"
            @click="nodeForm.color = option.color"
          >
            <Icon v-if="nodeForm.color === option.color" icon="ep:check" color="#fff" />
          </div>
        </div>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input type="textarea" v-model="nodeForm.remark" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="formVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { DICT_TYPE, getIntDictOptions } from '@/utils/dict'
import { SemesterCalendarApi, SemesterCalendarVO, SemesterVO } from '@/api/edu/semester'
import { EDU_COLOR_OPTIONS, EDU_DEFAULT_COLOR } from '@/utils/eduColor'

defineOptions({ name: 'SemesterCalendarDialog' })

/** 固定 16 色，禁止自定义输入（与标签共用同一套色板） */
const COLOR_OPTIONS = EDU_COLOR_OPTIONS

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000

const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const loading = ref(false) // 列表的加载中
const list = ref<SemesterCalendarVO[]>([]) // 列表的数据
const semesterId = ref<number>() // 当前学期编号
const semesterTitle = ref('') // 学期标题（用于可视化标题）
const semesterStart = ref<string>() // 学期开始日期（校历最小编辑日期）
const semesterEnd = ref<string>() // 学期结束日期（校历最大编辑日期）
const calendarDate = ref(new Date()) // 日历当前展示的月份

/** 头部标题：按 calendarDate 自行拼装「YYYY 年 M 月」，避免组件内置文案在日期无效时输出乱码 */
const calendarTitle = computed(() => {
  const current = calendarDate.value
  if (!(current instanceof Date) || Number.isNaN(current.getTime())) {
    return ''
  }
  return `${current.getFullYear()} 年 ${current.getMonth() + 1} 月`
})

/** 打开弹窗 */
const open = async (semester: SemesterVO) => {
  semesterId.value = semester.id
  semesterTitle.value = semester.name || ''
  semesterStart.value = semester.startDate
  semesterEnd.value = semester.endDate
  // 默认定位到「学期开始日期」所在月份，未维护开始日期时用今天
  calendarDate.value = semester.startDate ? new Date(semester.startDate + 'T00:00:00') : new Date()
  dialogVisible.value = true
  await getList()
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 判断某一天是否落在学期起止区间内（区间外不得编辑） */
const isEditableDay = (day: string) => {
  if (!semesterStart.value || !semesterEnd.value) {
    // 学期未维护起止日期时，不允许编辑校历，避免出现无法校验的脏数据
    return false
  }
  return day >= semesterStart.value && day <= semesterEnd.value
}

/** 取日期的「日」部分（YYYY-MM-DD → DD，去掉前导零） */
const dayOfMonth = (day: string) => Number(String(day).split('-')[2] || 0) || ''

/** 第几周：以学期开始日期为第 1 周起点，每 7 天为 1 周 */
const weekNoOfDay = (day: string) => {
  if (!semesterStart.value || !isEditableDay(day)) {
    return 0
  }
  const start = new Date(semesterStart.value + 'T00:00:00').getTime()
  const current = new Date(day + 'T00:00:00').getTime()
  return Math.floor((current - start) / MILLIS_PER_DAY / 7) + 1
}

/** 是否展示周次：学期开始日与每周一展示，避免单元格过于拥挤 */
const shouldShowWeek = (day: string) => {
  if (!isEditableDay(day)) {
    return false
  }
  if (day === semesterStart.value) {
    return true
  }
  return new Date(day + 'T00:00:00').getDay() === 1
}

/** 某一天命中的校历节点（按起止日期区间匹配；结束日期为空表示单日节点） */
const nodesOfDay = (day: string) => {
  const d = String(day)
  return list.value.filter((node) => {
    const start = node.startDate || node.endDate
    const end = node.endDate || node.startDate
    if (!start || !end) {
      return false
    }
    return d >= start && d <= end
  })
}

/** 可翻页判断：不得翻到学期开始月份之前 / 结束月份之后 */
const canPrevMonth = computed(() => {
  if (!semesterStart.value) {
    return false
  }
  const current = calendarDate.value
  const start = new Date(semesterStart.value + 'T00:00:00')
  return current.getFullYear() > start.getFullYear() ||
    (current.getFullYear() === start.getFullYear() && current.getMonth() > start.getMonth())
})
const canNextMonth = computed(() => {
  if (!semesterEnd.value) {
    return false
  }
  const current = calendarDate.value
  const end = new Date(semesterEnd.value + 'T00:00:00')
  return current.getFullYear() < end.getFullYear() ||
    (current.getFullYear() === end.getFullYear() && current.getMonth() < end.getMonth())
})

/** 翻月（受 canPrevMonth / canNextMonth 限制） */
const prevMonth = () => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() - 1)
  calendarDate.value = d
}
const nextMonth = () => {
  const d = new Date(calendarDate.value)
  d.setMonth(d.getMonth() + 1)
  calendarDate.value = d
}

/** 查询校历节点列表 */
const getList = async () => {
  loading.value = true
  try {
    list.value = await SemesterCalendarApi.getCalendarList(semesterId.value!)
  } finally {
    loading.value = false
  }
}

// ==================== 节点表单（内嵌二级弹窗） ====================
const formVisible = ref(false) // 表单弹窗是否展示
const formTitle = ref('') // 表单弹窗标题
const formLoading = ref(false) // 表单的加载中
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const nodeFormRef = ref() // 节点表单 Ref
const nodeForm = ref<SemesterCalendarVO>({
  id: undefined,
  semesterId: undefined,
  name: undefined,
  type: undefined,
  startDate: undefined,
  endDate: undefined,
  weekNo: undefined,
  color: undefined,
  remark: undefined
})
const nodeRules = reactive({
  name: [{ required: true, message: '节点名称不能为空', trigger: 'blur' }],
  type: [{ required: true, message: '类型不能为空', trigger: 'change' }],
  startDate: [{ required: true, message: '开始日期不能为空', trigger: 'change' }],
  endDate: [
    {
      validator: (_rule: any, value: string, callback: any) => {
        // 结束日期不得早于开始日期（留空表示单日节点，允许）
        if (value && nodeForm.value.startDate && value < nodeForm.value.startDate) {
          callback(new Error('结束日期不得早于开始日期'))
          return
        }
        callback()
      },
      trigger: 'change'
    }
  ]
})

/** 开始日期禁用：只能选择学期起止区间内的日期 */
const disabledNodeDate = (date: Date) => {
  if (!semesterStart.value || !semesterEnd.value) {
    return true
  }
  const day = formatDay(date)
  return day < semesterStart.value || day > semesterEnd.value
}

/** 结束日期禁用：区间外禁用；早于开始日期禁用 */
const disabledNodeEndDate = (date: Date) => {
  if (disabledNodeDate(date)) {
    return true
  }
  if (!nodeForm.value.startDate) {
    return true
  }
  return formatDay(date) < nodeForm.value.startDate
}

/** Date → YYYY-MM-DD（本地时间，避免 toISOString 的时区偏移） */
const formatDay = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 开始日期变化：自动按「以学期开始为第 1 周」推导周次；并清理不再合法的结束日期 */
const handleNodeStartDateChange = (value: string) => {
  if (nodeForm.value.endDate && nodeForm.value.endDate < value) {
    nodeForm.value.endDate = undefined
  }
  if (value && semesterStart.value) {
    nodeForm.value.weekNo = weekNoOfDay(value) || 1
  }
}

/**
 * 打开节点表单
 *
 * @param type create - 新增；update - 修改
 * @param row  修改时传入行数据；新增时可传入日期字符串（点击校历某一天新增单日节点）
 */
const openForm = (type: string, row?: SemesterCalendarVO | string) => {
  formVisible.value = true
  formType.value = type
  formTitle.value = type === 'create' ? '新增校历节点' : '修改校历节点'
  nodeForm.value = {
    id: undefined,
    semesterId: semesterId.value,
    name: undefined,
    type: undefined,
    startDate: undefined,
    endDate: undefined,
    weekNo: undefined,
    // 自动使用固定 16 色的第一个，避免出现无颜色节点
    color: EDU_DEFAULT_COLOR,
    remark: undefined
  }
  if (typeof row === 'string') {
    // 点击日历某天：预填为单日节点，并自动带出周次
    nodeForm.value.startDate = row
    nodeForm.value.weekNo = weekNoOfDay(row) || 1
  } else if (row) {
    nodeForm.value = { ...row, semesterId: semesterId.value, color: row.color || EDU_DEFAULT_COLOR }
  }
  nodeFormRef.value?.clearValidate()
}

/** 点击校历单元格：区间内则快速新增该日节点，区间外给出提示 */
const handleCellClick = (day: string) => {
  if (!isEditableDay(day)) {
    message.warning('校历仅可在学期起止日期区间内编辑')
    return
  }
  openForm('create', day)
}

/** 提交节点表单 */
const submitForm = async () => {
  await nodeFormRef.value.validate()
  formLoading.value = true
  try {
    if (formType.value === 'create') {
      await SemesterCalendarApi.createCalendar(nodeForm.value)
      message.success('新增成功')
    } else {
      await SemesterCalendarApi.updateCalendar(nodeForm.value)
      message.success('修改成功')
    }
    formVisible.value = false
    await getList()
  } finally {
    formLoading.value = false
  }
}

/** 删除节点 */
const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await SemesterCalendarApi.deleteCalendar(id)
    message.success('删除成功')
    await getList()
  } catch {}
}
</script>

<style scoped>
.edu-semester-calendar :deep(.el-calendar-day) {
  height: 88px;
  padding: 2px 4px;
  overflow: hidden;
}

.edu-semester-calendar .cal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0 8px;
}

.edu-semester-calendar .cal-header-month {
  font-size: 14px;
  font-weight: 600;
}

.edu-semester-calendar .cal-header-nav {
  display: flex;
  gap: 8px;
}

.edu-semester-calendar .cal-cell {
  height: 100%;
}

/* 区间外：置灰且不可点击（最小/最大编辑日期为学期起止日期） */
.edu-semester-calendar .cal-cell.is-disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.edu-semester-calendar .cal-cell.is-editable {
  cursor: pointer;
}

.edu-semester-calendar .cal-cell.is-editable:hover {
  background-color: #f0f7ff;
}

.edu-semester-calendar .cal-day {
  font-size: 12px;
  line-height: 16px;
}

.edu-semester-calendar .cal-week {
  font-size: 10px;
  line-height: 12px;
  color: #909399;
}

.edu-semester-calendar .cal-node-tag {
  display: block;
  max-width: 100%;
  margin-top: 2px;
  font-size: 11px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.color-swatch {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.color-swatch.is-active {
  outline: 2px solid #409eff;
  outline-offset: 1px;
}
</style>
