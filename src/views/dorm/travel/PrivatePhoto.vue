<template>
  <Dialog v-model="visible" title="离校照片（受控访问）" width="700px" :before-close="close">
    <div v-loading="loading" class="min-h-160px"
      ><img
        v-if="source"
        :src="source"
        alt="离校打卡照片"
        class="block mx-auto max-w-full max-h-65vh object-contain" /><el-empty
        v-else-if="!loading"
        description="照片不可用或无访问权限"
    /></div>
    <template #footer><el-button @click="close">关闭</el-button></template>
  </Dialog>
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Id } from '@/api/dorm/types'
import { useDormDialog } from '../useDorm'
const { visible, loading, open: show, close } = useDormDialog(() => ({}))
const source = ref('')
let revision = 0
const release = () => {
  revision++
  if (source.value) URL.revokeObjectURL(source.value)
  source.value = ''
}
const open = async (id: Id) => {
  release()
  const rev = revision
  await show(async () => {
    const blob = await Api.photo(id)
    if (rev !== revision || !visible.value) return {}
    if (!(blob instanceof Blob) || !['image/jpeg', 'image/png'].includes(blob.type)) {
      ElMessage.error('照片响应格式无效')
      return {}
    }
    source.value = URL.createObjectURL(blob)
    return {}
  })
}
watch(
  visible,
  (value) => {
    if (!value) release()
  },
  { flush: 'sync' }
)
onBeforeUnmount(release)
defineExpose({ open })
</script>
