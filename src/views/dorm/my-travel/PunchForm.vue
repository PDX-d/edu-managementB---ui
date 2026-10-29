<template>
  <Dialog
    v-model="visible"
    :title="returning ? '本人返校打卡' : '本人离校打卡'"
    width="700px"
    :before-close="close"
    :close-on-click-modal="false"
  >
    <el-form
      v-loading="loading"
      label-width="110px"
      :disabled="saving || reconciling || !ready || !!attempt"
    >
      <el-alert
        title="只记录位置，不提供围栏或定位防作弊保证。离校立即记为在外，审核拒绝也可以返校。"
        type="info"
        :closable="false"
        class="mb-15px"
      />
      <el-alert
        v-if="ready && !eligible"
        title="当前离返校状态已变化，不能继续本次操作。请关闭弹窗并刷新状态。"
        type="warning"
        :closable="false"
        class="mb-15px"
      />
      <el-form-item label="当前状态">{{
        data.context?.activeTrip ? '在外' : '无未返校记录'
      }}</el-form-item>
      <template v-if="!returning">
        <el-form-item label="离校照片"
          ><input
            :key="inputKey"
            type="file"
            accept="image/jpeg,image/png"
            :disabled="saving || reconciling || !!attempt || !ready"
            @change="choosePhoto"
          /><span class="text-12px text-gray-500"
            >JPEG / PNG，最大 5MB、2000 万像素</span
          ></el-form-item
        >
        <el-form-item v-if="preview" label="照片预览"
          ><img :src="preview" alt="待提交离校照片" class="max-w-full max-h-200px object-contain"
        /></el-form-item>
      </template>
      <el-form-item label="授权确认"
        ><el-checkbox v-model="data.consent" class="consent"
          >我同意本次获取当前位置并提交{{ returning ? '' : '照片及' }}定位信息</el-checkbox
        ></el-form-item
      >
    </el-form>
    <el-alert
      v-if="attempt && !saving"
      title="请求结果尚未确认。可核对服务器状态，或用完全相同的请求重试；不会自动重新定位覆盖原请求。采集过期且未入库时，需关闭后重新打卡。"
      type="warning"
      :closable="false"
      class="mt-15px"
    />
    <el-descriptions v-if="attempt" :column="1" border class="mt-15px"
      ><el-descriptions-item label="采集时间（服务器校准）">{{
        formatBizTime(attempt.data.capturedAt)
      }}</el-descriptions-item
      ><el-descriptions-item label="坐标 / 精度"
        >{{ attempt.data.latitude }}, {{ attempt.data.longitude }} /
        {{ attempt.data.accuracy }} 米</el-descriptions-item
      ></el-descriptions
    >
    <template #footer>
      <el-button v-if="attempt" :loading="reconciling" :disabled="saving" @click="reconcile"
        >核对服务器状态</el-button
      >
      <el-button
        type="primary"
        :loading="saving || checkingPhoto"
        :disabled="
          !ready ||
          !eligible ||
          !data.consent ||
          reconciling ||
          checkingPhoto ||
          (!returning && !photoFile)
        "
        @click="submit"
        >{{ attempt ? '重试原请求' : '获取定位并提交打卡' }}</el-button
      >
      <el-button :disabled="saving || reconciling" @click="close">取消</el-button>
    </template>
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as Api from '@/api/dorm'
import { dormContext } from '@/api/dorm/context'
import type { Id, Position, TravelContext } from '@/api/dorm/types'
import { formatBizTime, key, useDormDialog } from '../useDorm'
import { locate, validatePhoto } from '../travel/location'
const emit = defineEmits<{ success: [] }>()
const returning = ref(false)
const expectedTrip = ref<Id>()
const photoFile = shallowRef<File>()
const preview = ref('')
const checkingPhoto = ref(false)
const inputKey = ref(0)
const reconciling = ref(false)
const attempt = shallowRef<{ data: Position; tripId?: Id; photo?: File }>()
let photoRevision = 0
let operationRevision = 0
const initial = () => ({
  context: undefined as TravelContext | undefined,
  consent: false,
  photoName: ''
})
const { visible, loading, saving, ready, data, open: show, close, execute } = useDormDialog(initial)
const eligible = computed(
  () =>
    data.value.context &&
    (returning.value
      ? !!data.value.context.activeTrip &&
        key(data.value.context.activeTrip.id) === key(expectedTrip.value)
      : !data.value.context.activeTrip)
)
const clearPhoto = () => {
  photoRevision++
  if (preview.value) URL.revokeObjectURL(preview.value)
  preview.value = ''
  photoFile.value = undefined
  checkingPhoto.value = false
  inputKey.value++
}
const open = async (tripId?: Id) => {
  if (saving.value || reconciling.value) return
  operationRevision++
  clearPhoto()
  attempt.value = undefined
  returning.value = tripId != null
  expectedTrip.value = tripId
  await show(async () => ({ ...initial(), context: await Api.travelContext() }))
}
const choosePhoto = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  clearPhoto()
  data.value.photoName = ''
  if (!file) return
  const rev = photoRevision
  checkingPhoto.value = true
  try {
    const mime = await validatePhoto(file)
    if (rev !== photoRevision || !visible.value) return
    photoFile.value = new File([file], file.name, { type: mime })
    preview.value = URL.createObjectURL(photoFile.value)
    data.value.photoName = file.name
  } catch (error) {
    if (rev === photoRevision) ElMessage.error((error as Error).message)
  } finally {
    if (rev === photoRevision) checkingPhoto.value = false
  }
}
const submit = async () => {
  if (
    !eligible.value ||
    !data.value.consent ||
    checkingPhoto.value ||
    reconciling.value ||
    (!returning.value && !photoFile.value)
  )
    return
  const context = dormContext()
  const ensure = () => {
    if (!context || context !== dormContext() || !visible.value) throw new Error('身份已变化')
  }
  await execute(
    async () => {
      if (!attempt.value) {
        const latest = await Api.travelContext()
        const receivedAt = performance.now()
        ensure()
        if (
          returning.value
            ? key(latest.activeTrip?.id) !== key(expectedTrip.value)
            : !!latest.activeTrip
        ) {
          ElMessage.warning('出行状态已变化，请关闭并刷新')
          throw new Error('出行状态变化')
        }
        let position: Position
        try {
          position = await locate(latest.serverTime, receivedAt)
        } catch (error) {
          ElMessage.error((error as Error).message)
          throw error
        }
        ensure()
        attempt.value = {
          data: position,
          tripId: returning.value ? expectedTrip.value : undefined,
          photo: photoFile.value
        }
      }
      ensure()
      const current = attempt.value
      return current.tripId != null
        ? Api.returnTrip({ ...current.data, tripId: current.tripId })
        : Api.depart(current.data, current.photo!)
    },
    'travel:check-in',
    () => emit('success')
  )
}
const reconcile = async () => {
  if (!attempt.value || saving.value || reconciling.value) return
  const rev = operationRevision
  const original = attempt.value
  reconciling.value = true
  try {
    const latest = await Api.travelContext()
    const row = original.tripId != null ? await Api.trip(original.tripId) : latest.activeTrip
    if (rev !== operationRevision || !visible.value) return
    const confirmed =
      original.tripId != null
        ? row?.returnRequestId === original.data.requestId
        : row?.departRequestId === original.data.requestId
    if (confirmed) {
      visible.value = false
      ElMessage.success('服务器已确认本次打卡')
      emit('success')
    } else
      ElMessage.warning('尚未确认本次请求成功，请保留原请求重试或关闭后核对记录；不会自动重新打卡')
  } catch {
    return
  } finally {
    if (rev === operationRevision) reconciling.value = false
  }
}
watch(
  visible,
  (value) => {
    if (!value) {
      operationRevision++
      clearPhoto()
      attempt.value = undefined
      reconciling.value = false
    }
  },
  { flush: 'sync' }
)
onBeforeUnmount(() => {
  operationRevision++
  clearPhoto()
})
defineExpose({ open })
</script>
<style scoped>
.consent {
  height: auto;
  align-items: flex-start;
}
.consent :deep(.el-checkbox__label) {
  white-space: normal;
  line-height: 1.5;
}
</style>
