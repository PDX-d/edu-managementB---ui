<template>
  <Dialog v-model="dialogVisible" title="教室详情" width="600px">
    <el-descriptions v-loading="loading" :column="1" border>
      <el-descriptions-item label="教室编号">{{ detail?.code }}</el-descriptions-item>
      <el-descriptions-item label="教室名称">{{ detail?.name }}</el-descriptions-item>
      <el-descriptions-item label="位置">{{ detail?.location }}</el-descriptions-item>
      <el-descriptions-item label="容量">{{ detail?.capacity }}</el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag v-if="detail" :type="detail.status === 0 ? 'success' : 'info'">
          {{ detail.status === 0 ? '启用' : '停用' }}
        </el-tag>
      </el-descriptions-item>
    </el-descriptions>
  </Dialog>
</template>
<script lang="ts" setup>
import * as ClassroomApi from '@/api/timetable/classroom'
import type { TimetableId } from '@/api/timetable/types'

defineOptions({ name: 'TimetableClassroomDetail' })

const dialogVisible = ref(false)
const loading = ref(false)
const detail = ref<ClassroomApi.ClassroomVO>()

/** 打开弹窗，每次重新获取最新详情 */
const open = async (id: TimetableId) => {
  dialogVisible.value = true
  detail.value = undefined
  loading.value = true
  try {
    detail.value = await ClassroomApi.getClassroom(id)
  } finally {
    loading.value = false
  }
}
defineExpose({ open })
</script>
