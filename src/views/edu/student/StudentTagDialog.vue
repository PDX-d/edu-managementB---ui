<!-- 学生标签管理弹窗 -->
<template>
  <Dialog v-model="dialogVisible" title="学生标签管理" width="820">
    <div class="mb-10px">
      <el-button type="primary" plain @click="openForm('create')" v-hasPermi="['edu:student:tag:create']">
        <Icon icon="ep:plus" class="mr-5px" /> 新增标签
      </el-button>
      <span class="ml-10px text-12px text-gray-500">
        提示：按住最右侧「☰」手柄可拖拽排序，序号会自动重排
      </span>
    </div>
    <el-table ref="tableRef" v-loading="loading" :data="list" :stripe="true" row-key="id">
      <!-- 序号：展示在最左侧（sort 由后端维护，展示时 +1） -->
      <el-table-column label="序号" align="center" width="70px">
        <template #default="scope">{{ (scope.row.sort ?? 0) + 1 }}</template>
      </el-table-column>
      <el-table-column label="标签名称" align="center" prop="name" />
      <el-table-column label="颜色" align="center" width="140px">
        <template #default="scope">
          <el-tag v-if="scope.row.color" :color="scope.row.color" effect="dark">
            {{ scope.row.name }}
          </el-tag>
          <span v-else>—</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90px">
        <template #default="scope">
          <el-tag v-if="scope.row.status === 1" type="info">停用</el-tag>
          <el-tag v-else type="success">启用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="备注" align="center" prop="remark" />
      <el-table-column label="操作" align="center" width="130">
        <template #default="scope">
          <el-button
            link
            type="primary"
            @click="openForm('update', scope.row)"
            v-hasPermi="['edu:student:tag:update']"
          >
            编辑
          </el-button>
          <el-button
            link
            type="danger"
            @click="handleDelete(scope.row.id)"
            v-hasPermi="['edu:student:tag:delete']"
          >
            删除
          </el-button>
        </template>
      </el-table-column>
      <!-- 拖拽手柄：位于操作列之后，仅作为排序入口，无其它交互 -->
      <el-table-column label="" align="center" width="60px">
        <template #default>
          <span class="drag-handle" title="按住拖拽排序">☰</span>
        </template>
      </el-table-column>
    </el-table>
    <template #footer>
      <el-button @click="dialogVisible = false">关 闭</el-button>
    </template>
  </Dialog>

  <!-- 标签表单弹窗 -->
  <Dialog v-model="formVisible" :title="formTitle" width="460" append-to-body>
    <el-form ref="tagFormRef" :model="tagForm" :rules="tagRules" label-width="90px">
      <el-form-item label="标签名称" prop="name">
        <el-input v-model="tagForm.name" placeholder="请输入标签名称" />
      </el-form-item>
      <el-form-item label="颜色" prop="color">
        <!-- 固定 16 色单选色板：禁止自定义输入 -->
        <div class="color-palette">
          <div
            v-for="option in COLOR_OPTIONS"
            :key="option.color"
            class="color-swatch"
            :class="{ 'is-active': tagForm.color === option.color }"
            :style="{ backgroundColor: option.color }"
            :title="option.name"
            @click="tagForm.color = option.color"
          >
            <Icon v-if="tagForm.color === option.color" icon="ep:check" color="#fff" />
          </div>
        </div>
      </el-form-item>
      <el-form-item label="状态" prop="status">
        <el-radio-group v-model="tagForm.status">
          <el-radio :value="0">开启</el-radio>
          <el-radio :value="1">关闭</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="备注" prop="remark">
        <el-input type="textarea" v-model="tagForm.remark" placeholder="请输入备注" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="submitForm" type="primary" :disabled="formLoading">确 定</el-button>
      <el-button @click="formVisible = false">取 消</el-button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Sortable from 'sortablejs'
import { StudentTagApi, StudentTagVO } from '@/api/edu/student'
import { EDU_COLOR_OPTIONS, EDU_DEFAULT_COLOR } from '@/utils/eduColor'

defineOptions({ name: 'StudentTagDialog' })

/** 固定 16 色，禁止自定义输入（与校历节点共用同一套色板） */
const COLOR_OPTIONS = EDU_COLOR_OPTIONS
const DEFAULT_COLOR = EDU_DEFAULT_COLOR

const emit = defineEmits(['success']) // 变更成功后通知父页面刷新
const message = useMessage() // 消息弹窗

const dialogVisible = ref(false) // 弹窗的是否展示
const loading = ref(false) // 列表的加载中
const list = ref<StudentTagVO[]>([]) // 列表的数据
const tableRef = ref() // 标签表格 Ref
let sortableInstance: Sortable | null = null // 拖拽排序实例

/** 打开弹窗 */
const open = async () => {
  dialogVisible.value = true
  await getList()
  await initSortable()
}
defineExpose({ open }) // 提供 open 方法，用于打开弹窗

/** 查询标签列表 */
const getList = async () => {
  loading.value = true
  try {
    list.value = await StudentTagApi.getTagList()
  } finally {
    loading.value = false
  }
}

/** 初始化拖拽排序（长按手柄进入排序态，拖拽后提交新顺序） */
const initSortable = async () => {
  await nextTick()
  const tbody = tableRef.value?.$el?.querySelector('.el-table__body-wrapper tbody')
  if (!tbody) {
    return
  }
  // 重复打开时先销毁旧实例，避免重复绑定
  sortableInstance?.destroy()
  sortableInstance = Sortable.create(tbody as HTMLElement, {
    handle: '.drag-handle', // 仅手柄可拖拽
    animation: 150,
    delay: 120, // 长按后进入排序态
    delayOnTouchOnly: false,
    onEnd: handleSortEnd
  })
}

/** 拖拽结束：提交新顺序，后端批量重写 sort（连续递增且唯一） */
const handleSortEnd = async (evt: any) => {
  const { oldIndex, newIndex } = evt
  if (oldIndex === newIndex || oldIndex == null || newIndex == null) {
    return
  }
  // 同步本地数据顺序，与 DOM 保持一致
  const arr = [...list.value]
  const [moved] = arr.splice(oldIndex, 1)
  arr.splice(newIndex, 0, moved)
  list.value = arr
  try {
    await StudentTagApi.reorderTag(arr.map((tag) => tag.id as number))
    message.success('排序已更新')
    await getList()
    emit('success')
  } catch {
    // 失败时回滚为服务端顺序
    await getList()
  }
}

// ==================== 标签表单（内嵌二级弹窗） ====================
const formVisible = ref(false) // 表单弹窗是否展示
const formTitle = ref('') // 表单弹窗标题
const formLoading = ref(false) // 表单的加载中
const formType = ref('') // 表单的类型：create - 新增；update - 修改
const tagFormRef = ref() // 标签表单 Ref
const tagForm = ref<StudentTagVO>({
  id: undefined,
  name: undefined,
  color: DEFAULT_COLOR,
  status: 0,
  remark: undefined
})

/** 标签名称去重校验（同租户下唯一，前端即时提示；后端与唯一索引兜底） */
function validateNameUnique(_rule: any, value: any, callback: any) {
  if (!value) {
    return callback()
  }
  const name = (value as string).trim()
  const duplicated = list.value.some((tag) => tag.name === name && tag.id !== tagForm.value.id)
  if (duplicated) {
    return callback(new Error('标签名称已存在'))
  }
  callback()
}

const tagRules = reactive({
  name: [
    { required: true, message: '标签名称不能为空', trigger: 'blur' },
    { validator: validateNameUnique, trigger: 'blur' }
  ],
  color: [{ required: true, message: '请选择标签颜色', trigger: 'change' }]
})

/** 打开标签表单 */
const openForm = (type: string, row?: StudentTagVO) => {
  formVisible.value = true
  formType.value = type
  formTitle.value = type === 'create' ? '新增标签' : '修改标签'
  // 排序由后端处理：新增追加到末尾、状态切换触发重排
  tagForm.value = {
    id: undefined,
    name: undefined,
    color: DEFAULT_COLOR,
    status: 0,
    remark: undefined
  }
  if (row) {
    tagForm.value = {
      id: row.id,
      name: row.name,
      color: row.color || DEFAULT_COLOR,
      status: row.status ?? 0,
      remark: row.remark
    }
  }
  tagFormRef.value?.clearValidate()
}

/** 提交标签表单 */
const submitForm = async () => {
  await tagFormRef.value.validate()
  formLoading.value = true
  try {
    // 显式构造入参：不提交 sort（后端维护）
    const payload: StudentTagVO = {
      id: tagForm.value.id,
      name: tagForm.value.name?.trim(),
      color: tagForm.value.color,
      status: tagForm.value.status,
      remark: tagForm.value.remark
    }
    if (formType.value === 'create') {
      await StudentTagApi.createTag(payload)
      message.success('新增成功')
    } else {
      await StudentTagApi.updateTag(payload)
      message.success('修改成功')
    }
    formVisible.value = false
    // 自动刷新：刷新标签列表并通知父页面刷新学生列表
    await getList()
    emit('success')
  } finally {
    formLoading.value = false
  }
}

/** 删除标签 */
const handleDelete = async (id: number) => {
  try {
    await message.delConfirm()
    await StudentTagApi.deleteTag(id)
    message.success('删除成功')
    await getList()
    emit('success')
  } catch {}
}

onBeforeUnmount(() => {
  sortableInstance?.destroy()
  sortableInstance = null
})
</script>

<style scoped>
.color-palette {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-swatch {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dcdfe6;
  box-sizing: border-box;
}

.color-swatch.is-active {
  outline: 2px solid #409eff;
  outline-offset: 1px;
}

.drag-handle {
  cursor: move;
  color: #909399;
  font-size: 16px;
  user-select: none;
}
</style>
