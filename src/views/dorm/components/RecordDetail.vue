<template>
  <Dialog v-model="visible" title="记录详情" width="780px" :before-close="close">
    <el-descriptions v-loading="loading" :column="2" border>
      <el-descriptions-item
        v-for="field in fields"
        :key="field.key"
        :label="field.title"
        :span="field.wide ? 2 : 1"
        >{{ field.value }}</el-descriptions-item
      >
    </el-descriptions>
    <el-empty v-if="!loading && !ready" description="详情不可用，请关闭后重试" />
    <template #footer><el-button @click="close">关闭</el-button></template>
  </Dialog>
</template>
<script setup lang="ts">
import * as Api from '@/api/dorm'
import type { Id } from '@/api/dorm/types'
import { formatBizTime, label, money, useDormDialog } from '../useDorm'
type Kind = 'stay' | 'change' | 'night' | 'hygiene' | 'violation' | 'trip'
const {
  visible,
  loading,
  ready,
  data,
  open: show,
  close
} = useDormDialog(() => ({}) as Record<string, unknown>)
const names: Record<string, string> = {
  id: '记录编号',
  rowVersion: '版本',
  studentNo: '学号',
  studentName: '学生',
  className: '班级',
  bedLabel: '床位',
  roomLabel: '房间',
  gender: '性别',
  status: '状态',
  checkInTime: '实际入住',
  checkOutTime: '实际退宿',
  depositAmount: '线下实收押金（元）',
  deductionAmount: '扣款（元）',
  refundAmount: '应退金额（元）',
  refundStatus: '退款状态',
  refundTime: '线下退款确认时间',
  inspection: '物品检查',
  deductionReason: '扣款原因',
  sourceBedLabel: '原床位',
  targetBedLabel: '目标床位',
  stayVersion: '申请时住宿版本',
  source: '来源',
  reason: '原因',
  reviewedAt: '审核时间',
  reviewReason: '审核说明',
  checkDate: '日期',
  score: '卫生评分',
  remark: '备注',
  occurredAt: '发生时间',
  type: '违规类型',
  description: '违规说明',
  disciplineId: '外部处分编号',
  departTime: '离校打卡时间',
  returnTime: '返校打卡时间',
  reviewStatus: '离校审核',
  departLatitude: '离校纬度',
  departLongitude: '离校经度',
  departAccuracy: '离校精度（米）',
  departCapturedAt: '离校采集时间',
  returnLatitude: '返校纬度',
  returnLongitude: '返校经度',
  returnAccuracy: '返校精度（米）',
  returnCapturedAt: '返校采集时间',
  createTime: '创建时间'
}
const states = new Set(['gender', 'status', 'refundStatus', 'source', 'reviewStatus'])
const times = new Set([
  'checkInTime',
  'checkOutTime',
  'refundTime',
  'reviewedAt',
  'occurredAt',
  'departTime',
  'returnTime',
  'departCapturedAt',
  'returnCapturedAt',
  'createTime'
])
const amounts = new Set(['depositAmount', 'deductionAmount', 'refundAmount'])
const fields = computed(() =>
  Object.entries(names)
    .filter(([k]) => k in data.value)
    .map(([k, title]) => {
      const value = data.value[k]
      return {
        key: k,
        title,
        wide: [
          'reason',
          'reviewReason',
          'inspection',
          'description',
          'remark',
          'deductionReason'
        ].includes(k),
        value:
          value == null
            ? '—'
            : times.has(k)
              ? formatBizTime(Number(value))
              : states.has(k)
                ? label(String(value))
                : amounts.has(k)
                  ? money(String(value))
                  : String(value)
      }
    })
)
const readers = {
  stay: Api.stay,
  change: Api.change,
  night: Api.night,
  hygiene: Api.hygiene,
  violation: Api.violation,
  trip: Api.trip
}
const open = (kind: Kind, id: Id) => show(async () => ({ ...(await readers[kind](id)) }))
defineExpose({ open })
</script>
