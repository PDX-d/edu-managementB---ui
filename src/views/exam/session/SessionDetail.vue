<template>
  <Dialog v-model="visible" title="考试详情" width="900px">
    <div v-loading="loading">
      <el-descriptions v-if="session" :column="2" border>
        <el-descriptions-item label="考试">{{ session.name }}</el-descriptions-item>
        <el-descriptions-item label="学期">{{ session.semesterName }}</el-descriptions-item>
        <el-descriptions-item label="课程">{{ session.courseName }}</el-descriptions-item>
        <el-descriptions-item label="班级">{{
          session.classNames.join('、')
        }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ session.startTime }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ session.endTime }}</el-descriptions-item>
        <el-descriptions-item label="考场">{{ session.venueName }}</el-descriptions-item>
        <el-descriptions-item label="位置">{{ session.venueAddress }}</el-descriptions-item>
        <el-descriptions-item label="签到半径">{{ session.radiusMeters }} 米</el-descriptions-item>
        <el-descriptions-item label="安排状态">{{
          session.archived ? '已归档' : session.participantsLocked ? '已冻结' : '未冻结'
        }}</el-descriptions-item>
      </el-descriptions>
      <el-divider content-position="left">成绩分项</el-divider>
      <el-table :data="session?.scoreItems || []" border
        ><el-table-column label="分项" prop="name" /><el-table-column
          label="权重（%）"
          prop="weight"
      /></el-table>
      <el-divider content-position="left">考试名册与签到</el-divider>
      <el-table :data="participants" max-height="360"
        ><el-table-column label="学号" prop="studentNo" /><el-table-column
          label="姓名"
          prop="studentName"
        /><el-table-column label="班级" prop="className" /><el-table-column
          label="签到时间"
          min-width="180"
          ><template #default="{ row }">{{ row.signTime || '未签到' }}</template></el-table-column
        ></el-table
      >
    </div>
  </Dialog>
</template>
<script setup lang="ts">
import * as api from '@/api/exam'
import type { ExamId, Participant, Session } from '@/api/exam/types'
import { useExamSync } from '../useExamSync'
const visible = ref(false)
const loading = ref(false)
const session = ref<Session>()
const participants = ref<Participant[]>([])
let revision = 0
const open = async (id: ExamId) => {
  visible.value = true
  loading.value = true
  session.value = undefined
  participants.value = []
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  try {
    const [detail, roster] = await Promise.all([api.getSession(id), api.getParticipants(id)])
    if (current !== revision) return
    session.value = detail
    participants.value = roster
    sync.settled(ticket)
  } finally {
    if (current === revision) loading.value = false
  }
}
const sync = useExamSync({
  matches: (change) =>
    change.type !== 'venue' && String(change.sessionId) === String(session.value?.id),
  enabled: () => visible.value && !!session.value,
  busy: () => loading.value,
  reload: () => open(session.value!.id),
  reset: () => {
    revision++
    visible.value = false
    session.value = undefined
    participants.value = []
    loading.value = false
  }
})
defineExpose({ open })
</script>
