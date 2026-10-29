<template>
  <Dialog v-model="visible" title="房间床位" width="700px" :before-close="close">
    <el-alert
      title="床位状态不是入住状态；停用已分配床位会被服务端拒绝。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <el-table v-loading="loading || saving" :data="data.beds">
      <el-table-column prop="bedLabel" label="床位" min-width="240" />
      <el-table-column label="状态" width="100"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 0 ? 'success' : 'info'">{{
            row.status === 0 ? '启用' : '停用'
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column v-if="can('admin') && can('room:update')" label="操作" width="110"
        ><template #default="{ row }"
          ><el-button link type="primary" :disabled="saving" @click="toggle(row)">{{
            row.status === 0 ? '停用' : '启用'
          }}</el-button></template
        ></el-table-column
      >
    </el-table>
    <template #footer><el-button :disabled="saving" @click="close">关闭</el-button></template>
  </Dialog>
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import type { Id, Bed } from '@/api/dorm/types'
import { can, useDormDialog, version, confirmAction } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const {
  visible,
  loading,
  saving,
  data,
  open: show,
  close,
  execute
} = useDormDialog(() => ({ roomId: undefined as Id | undefined, beds: [] as Bed[] }))
const open = (roomId: Id) => show(async () => ({ roomId, beds: await Api.beds(roomId) }))
const toggle = async (row: Bed) => {
  if (!can('admin') || !can('room:update') || saving.value) return
  if (!(await confirmAction(`确认${row.status === 0 ? '停用' : '启用'} ${row.bedLabel}？`))) return
  await execute(
    () => Api.updateBed({ ...version(row), status: row.status === 0 ? 1 : 0 }),
    'room:update',
    () => {
      emit('success')
    }
  )
}
defineExpose({ open })
</script>
