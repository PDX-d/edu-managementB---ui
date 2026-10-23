<template>
  <Dialog v-model="visible" title="导入考试成绩" width="700px">
    <SyncNotice
      :stale="sync.stale.value"
      :dirty="!!file"
      :busy="loading || downloading"
      @refresh="sync.refresh"
    />
    <el-alert
      title="先下载本场最新模板，只修改成绩单元格。仅支持单工作表 .xlsx、最大 5MB / 5000 行；任何错误整批不写入。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <el-button
      :loading="downloading"
      :disabled="!session || !!session.archived || loading"
      @click="template"
      ><Icon icon="ep:download" class="mr-5px" />下载本场模板</el-button
    >
    <el-upload
      ref="uploadRef"
      class="mt-15px"
      accept=".xlsx"
      :auto-upload="false"
      :limit="1"
      :disabled="loading || !session || !!session.archived"
      :on-change="select"
      :on-remove="clearFile"
      :on-exceed="exceed"
    >
      <el-button plain type="primary">选择 Excel 文件</el-button>
    </el-upload>
    <el-alert
      v-if="result"
      class="mt-15px"
      :type="result.errors.length ? 'error' : 'success'"
      :title="
        result.errors.length
          ? '导入未生效，请修正后重新导入'
          : `成功导入 ${result.successCount} 条成绩`
      "
      :closable="false"
    />
    <el-table v-if="result?.errors.length" :data="result.errors" class="mt-15px" max-height="300"
      ><el-table-column label="行号" prop="row" width="80" /><el-table-column
        label="错误原因"
        prop="message"
    /></el-table>
    <template #footer
      ><el-button
        type="primary"
        :loading="loading"
        :disabled="!file || !session || !!session.archived"
        @click="submit"
        >开始导入</el-button
      ><el-button :disabled="loading" @click="visible = false">关 闭</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import type { UploadFile, UploadInstance } from 'element-plus'
import * as api from '@/api/exam'
import type { ExamId, ImportResult, Session } from '@/api/exam/types'
import { can, saveExportFile } from '../useExam'
import { ExportFileError } from '@/views/timetable/utils'
import SyncNotice from '../components/SyncNotice.vue'
import { useExamSync } from '../useExamSync'

const visible = ref(false)
const loading = ref(false)
const downloading = ref(false)
const file = ref<File>()
const session = ref<Session>()
const result = ref<ImportResult>()
const uploadRef = ref<UploadInstance>()
const message = useMessage()
const emit = defineEmits(['success'])
let revision = 0
watch(
  visible,
  (show) => {
    if (!show) {
      revision++
      loading.value = false
      downloading.value = false
    }
  },
  { flush: 'sync' }
)
const clearFile = () => {
  file.value = undefined
  result.value = undefined
}
const exceed = () => message.warning('请先移除已选文件，再选择新的文件')
const select = (item: UploadFile) => {
  clearFile()
  if (
    !item.raw ||
    !/\.xlsx$/i.test(item.name) ||
    item.size === undefined ||
    item.size > 5 * 1024 * 1024 ||
    item.size === 0
  ) {
    message.warning('请选择非空、最大 5MB 的 .xlsx 文件')
    uploadRef.value?.clearFiles()
    return
  }
  file.value = item.raw
}
const open = async (id: ExamId) => {
  if (!can('score:import') || !can('session:query')) return
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  visible.value = true
  session.value = undefined
  clearFile()
  uploadRef.value?.clearFiles()
  loading.value = true
  try {
    const data = await api.getSession(id)
    if (current !== revision || !visible.value) return
    session.value = data
    sync.settled(ticket)
  } finally {
    if (current === revision) loading.value = false
  }
}
const template = async () => {
  if (!session.value || downloading.value || session.value.archived) return
  downloading.value = true
  const current = revision
  try {
    const blob = await api.getImportTemplate(session.value.id)
    if (current !== revision || !visible.value) return
    await saveExportFile(
      blob,
      '考试成绩导入模板.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
  } catch (error) {
    if (error instanceof ExportFileError) message.error(error.message)
  } finally {
    if (current === revision) downloading.value = false
  }
}
const submit = async () => {
  if (
    !file.value ||
    !session.value ||
    session.value.archived ||
    loading.value ||
    !can('score:import')
  )
    return
  loading.value = true
  const current = revision
  result.value = undefined
  try {
    const imported = await api.importScores(
      session.value.id,
      session.value.sessionVersion,
      file.value
    )
    if (current !== revision || !visible.value) return
    result.value = imported
    if (!result.value.errors.length && result.value.successCount > 0) {
      file.value = undefined
      uploadRef.value?.clearFiles()
      emit('success')
    }
  } finally {
    if (current === revision) loading.value = false
  }
}
const sync = useExamSync({
  matches: (change) =>
    change.type !== 'venue' && String(change.sessionId) === String(session.value?.id),
  dirty: () => !!file.value,
  busy: () => loading.value || downloading.value,
  enabled: () => visible.value && !!session.value,
  reload: async () => {
    const current = revision
    const ticket = sync.checkpoint()
    if (current !== revision) return
    loading.value = true
    try {
      const data = await api.getSession(session.value!.id)
      if (current !== revision || !visible.value) return
      session.value = data
      if (file.value) {
        clearFile()
        uploadRef.value?.clearFiles()
      }
      sync.settled(ticket)
    } finally {
      if (current === revision) loading.value = false
    }
  },
  reset: () => {
    visible.value = false
    revision++
    session.value = undefined
    clearFile()
    uploadRef.value?.clearFiles()
  }
})
defineExpose({ open })
</script>
