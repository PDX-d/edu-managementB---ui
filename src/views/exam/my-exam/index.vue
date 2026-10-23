<template>
  <ContentWrap>
    <el-form :inline="true" class="-mb-15px" label-width="68px">
      <el-form-item label="考试名称"
        ><el-input
          v-model="query.name"
          clearable
          maxlength="100"
          placeholder="请输入考试名称"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item label="考试日期"
        ><el-date-picker
          v-model="dates"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          class="!w-280px"
      /></el-form-item>
      <el-form-item
        ><el-button :disabled="!!signing" @click="search"
          ><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button :disabled="!!signing" @click="reset"
          ><Icon icon="ep:refresh" class="mr-5px" />重置</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <el-alert
      title="仅显示本人考试。签到需在安全连接（HTTPS 或本机 localhost）下授权定位；默认考前 30 分钟开放、开考即关闭，是否成功以后端校验为准。时间均为北京时间。"
      type="info"
      :closable="false"
      class="mb-15px"
    />
    <div v-loading="loading" class="exam-cards">
      <el-card v-for="exam in rows" :key="exam.id" shadow="never">
        <template #header
          ><div class="flex items-center justify-between gap-10px"
            ><span class="font-bold">{{ exam.name }}</span
            ><el-tag :type="exam.signTime ? 'success' : 'info'">{{
              exam.signTime ? '已签到' : state(exam)
            }}</el-tag></div
          ></template
        >
        <div class="exam-info">
          <div><span>课程</span>{{ exam.courseName }}</div>
          <div><span>考试时间</span>{{ exam.startTime }} ～ {{ exam.endTime }}</div>
          <div><span>考场</span>{{ exam.venueName }}</div>
          <div><span>位置</span>{{ exam.venueAddress }}</div>
          <div><span>签到开放</span>{{ exam.checkInOpenTime }}</div>
          <div v-if="exam.signTime"><span>签到时间</span>{{ exam.signTime }}</div>
        </div>
        <div class="mt-15px flex flex-wrap gap-10px">
          <el-button type="primary" plain @click="showDetail(exam)">详情</el-button>
          <el-button
            v-hasPermi="['exam:check-in:create']"
            type="primary"
            :loading="signing === key(exam.id)"
            :disabled="!!signing || !available(exam)"
            @click="sign(exam)"
            ><Icon icon="ep:location" class="mr-5px" />{{
              exam.signTime ? '已签到' : '定位签到'
            }}</el-button
          >
        </div>
      </el-card>
    </div>
    <el-empty v-if="!loading && !rows.length" description="暂无本人考试" />
    <Pagination
      v-model:page="query.pageNo"
      v-model:limit="query.pageSize"
      :total="total"
      @pagination="load"
    />
  </ContentWrap>
  <Dialog v-model="detailVisible" title="本人考试详情" width="600px">
    <el-descriptions v-if="detail" :column="1" border>
      <el-descriptions-item label="考试">{{ detail.name }}</el-descriptions-item>
      <el-descriptions-item label="课程">{{ detail.courseName }}</el-descriptions-item>
      <el-descriptions-item label="时间"
        >{{ detail.startTime }} ～ {{ detail.endTime }}</el-descriptions-item
      >
      <el-descriptions-item label="考场">{{ detail.venueName }}</el-descriptions-item>
      <el-descriptions-item label="位置">{{ detail.venueAddress }}</el-descriptions-item>
      <el-descriptions-item label="签到时间">{{
        detail.signTime || '未签到'
      }}</el-descriptions-item>
    </el-descriptions>
  </Dialog>
</template>
<script setup lang="ts">
import * as api from '@/api/exam'
import type { ExamQuery, MyExam } from '@/api/exam/types'
import { can, defaultQuery, formatBizTime, getExamPage, key, parseBizTime } from '../useExam'
import { useExamSync } from '../useExamSync'
import { examContext, assertExamContext } from '@/api/exam/sync'

defineOptions({ name: 'ExamMyExam' })
const message = useMessage()
const query = ref(defaultQuery())
const applied = ref(defaultQuery())
const dates = ref<[string, string] | null>(null)
const rows = ref<MyExam[]>([])
const total = ref(0)
const loading = ref(false)
const signing = ref('')
const detailVisible = ref(false)
const detail = ref<MyExam>()
const elapsed = ref(0)
let received = performance.now()
let timer: ReturnType<typeof setInterval> | undefined
let revision = 0
const now = (exam: MyExam) => parseBizTime(exam.serverTime) + elapsed.value
const available = (exam: MyExam) =>
  !exam.archived &&
  !exam.signTime &&
  now(exam) >= parseBizTime(exam.checkInOpenTime) &&
  now(exam) < parseBizTime(exam.startTime)
const state = (exam: MyExam) =>
  exam.archived
    ? '已归档'
    : now(exam) < parseBizTime(exam.checkInOpenTime)
      ? '未开放签到'
      : now(exam) >= parseBizTime(exam.startTime)
        ? '签到已结束'
        : '可签到'
const fetchList = async (
  params: ExamQuery = { ...query.value, startDate: dates.value?.[0], endDate: dates.value?.[1] }
) => {
  const current = ++revision
  const ticket = sync.checkpoint()
  if (current !== revision) return
  loading.value = true
  try {
    const result = await getExamPage(params, api.getMyExamPage)
    if (current !== revision) return
    received = performance.now()
    elapsed.value = 0
    rows.value = result.list
    total.value = result.total
    query.value.pageNo = params.pageNo
    applied.value = params
    sync.settled(ticket)
    if (detailVisible.value && detail.value) detail.value = await api.getMyExam(detail.value.id)
  } catch {
    if (current === revision) {
      rows.value = []
      total.value = 0
    }
  } finally {
    if (current === revision) loading.value = false
  }
}
const load = () => fetchList()
const search = () => {
  query.value.pageNo = 1
  void load()
}
const reset = () => {
  query.value = defaultQuery()
  dates.value = null
  void load()
}
const showDetail = async (exam: MyExam) => {
  detail.value = await api.getMyExam(exam.id)
  detailVisible.value = true
}
const locate = (serverTime: number, receivedAt: number) =>
  new Promise<{ position: GeolocationPosition; capturedAt: number }>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const elapsed = performance.now() - receivedAt
        if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 15000) {
          reject({ code: 3 })
          return
        }
        resolve({ position, capturedAt: serverTime + elapsed })
      },
      reject,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    )
  })
const sign = async (exam: MyExam) => {
  if (signing.value || !can('check-in:create')) return
  const context = examContext()
  if (!window.isSecureContext)
    return message.warning('定位需要 HTTPS 安全连接或本机 localhost，请更换访问方式')
  if (!navigator.geolocation)
    return message.warning('当前浏览器不支持定位，请使用支持定位的手机浏览器')
  try {
    await message.confirm(
      '本次签到将申请获取当前位置并提交至服务器校验，仅点击签到时获取，是否继续？'
    )
  } catch {
    return
  }
  assertExamContext(context)
  signing.value = key(exam.id)
  try {
    const latest = await api.getMyExam(exam.id)
    const receivedAt = performance.now()
    if (latest.signTime) {
      message.success('已签到，无需重复操作')
      await load()
      return
    }
    const serverNow = parseBizTime(latest.serverTime)
    if (!Number.isFinite(serverNow)) {
      message.error('无法校准服务器时间，请刷新后重试')
      return
    }
    if (
      latest.archived ||
      serverNow < parseBizTime(latest.checkInOpenTime) ||
      serverNow >= parseBizTime(latest.startTime)
    ) {
      message.warning('当前不在签到时间窗口内或学期已归档')
      await load()
      return
    }
    const { position, capturedAt } = await locate(serverNow, receivedAt)
    assertExamContext(context)
    const result = await api.checkIn({
      sessionId: exam.id,
      latitude: Number(position.coords.latitude.toFixed(7)),
      longitude: Number(position.coords.longitude.toFixed(7)),
      accuracy: Math.ceil(position.coords.accuracy * 100) / 100,
      capturedAt: formatBizTime(capturedAt)
    })
    if (result.checkedIn) message.success(`签到成功：${result.signTime}`)
    await load()
  } catch (error) {
    const code = (error as GeolocationPositionError)?.code
    if (typeof code === 'number' && code >= 1 && code <= 3)
      message.error(
        code === 1
          ? '定位权限被拒绝，请在浏览器设置中允许定位后重试'
          : code === 2
            ? '无法获取当前位置，请检查设备定位服务后重试'
            : '获取定位超时，请在网络和定位信号良好时重试'
      )
  } finally {
    if (context.stamp === examContext().stamp) signing.value = ''
  }
}
const sync = useExamSync({
  matches: (change) => change.type === 'session' || change.type === 'check-in',
  busy: () => loading.value || !!signing.value,
  reload: () => fetchList({ ...applied.value }),
  reset: () => {
    revision++
    rows.value = []
    total.value = 0
    loading.value = false
    signing.value = ''
    detailVisible.value = false
    detail.value = undefined
    dates.value = null
    query.value = defaultQuery()
    applied.value = defaultQuery()
  }
})
onMounted(() => {
  timer = setInterval(() => {
    elapsed.value = performance.now() - received
  }, 1000)
  void load()
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})
</script>
<style scoped>
.exam-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 16px;
}
.exam-info {
  display: grid;
  gap: 10px;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.exam-info > div {
  display: flex;
  gap: 12px;
}
.exam-info span {
  min-width: 70px;
  color: var(--el-text-color-secondary);
}
</style>
