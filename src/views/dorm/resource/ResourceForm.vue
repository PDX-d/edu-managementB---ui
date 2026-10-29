<template>
  <Dialog
    v-model="visible"
    :title="`${readonly ? '查看' : editing ? '修改' : '新增'}${kind === 'building' ? '楼栋' : '房间'}`"
    width="640px"
    :before-close="close"
    :close-on-click-modal="false"
  >
    <el-form
      ref="formRef"
      v-loading="loading"
      :model="kind === 'building' ? data.building : data.room"
      label-width="110px"
      :disabled="readonly || saving || !ready"
    >
      <template v-if="kind === 'building'">
        <el-form-item label="楼栋名称" prop="name" :rules="required"
          ><el-input v-model="data.building.name" maxlength="100"
        /></el-form-item>
        <el-form-item label="楼层数" prop="floors" :rules="required"
          ><el-input-number v-model="data.building.floors" :min="1" :max="100" :precision="0"
        /></el-form-item>
        <el-form-item label="性别限制"
          ><el-select v-model="data.building.gender"
            ><el-option
              v-for="g in ['MALE', 'FEMALE', 'UNLIMITED']"
              :key="g"
              :label="label(g)"
              :value="g" /></el-select
        ></el-form-item>
        <el-form-item label="状态"
          ><el-radio-group v-model="data.building.status"
            ><el-radio :value="0">启用</el-radio
            ><el-radio :value="1">停用</el-radio></el-radio-group
          ></el-form-item
        >
      </template>
      <template v-else>
        <el-form-item label="所属楼栋" prop="buildingId" :rules="required"
          ><DormPicker
            v-model="data.room.buildingId"
            kind="building"
            :disabled="editing"
            :selected-label="data.buildingLabel"
        /></el-form-item>
        <el-form-item label="房间号" prop="roomNo" :rules="required"
          ><el-input v-model="data.room.roomNo" maxlength="32"
        /></el-form-item>
        <el-form-item label="所在楼层"
          ><el-input-number v-model="data.room.floorNumber" :min="1" :max="100" :precision="0"
        /></el-form-item>
        <el-form-item label="状态"
          ><el-radio-group v-model="data.room.status"
            ><el-radio :value="0">启用</el-radio
            ><el-radio :value="1">停用</el-radio></el-radio-group
          ></el-form-item
        >
        <el-form-item v-if="editing && !readonly" label="调整床位"
          ><el-checkbox v-model="data.resize"
            >同时调整床位规模（会启用编号范围内床位）</el-checkbox
          ></el-form-item
        >
        <el-form-item v-if="readonly" label="启用床位数">{{
          data.room.bedCount ?? 0
        }}</el-form-item>
        <el-form-item v-if="!readonly && (!editing || data.resize)" label="床位规模"
          ><el-input-number v-model="data.room.bedCount" :min="1" :max="100" :precision="0"
        /></el-form-item>
      </template>
      <el-alert
        title="已有历史引用的资源通常只能停用；性别、楼层和床位调整以服务端校验为准。"
        type="info"
        :closable="false"
      />
    </el-form>
    <template #footer
      ><el-button
        v-if="!readonly"
        type="primary"
        :loading="saving"
        :disabled="!ready"
        @click="submit"
        >保存</el-button
      ><el-button :disabled="saving" @click="close">{{
        readonly ? '关闭' : '取消'
      }}</el-button></template
    >
  </Dialog>
</template>
<script setup lang="ts">
import type { FormInstance } from 'element-plus'
import * as Api from '@/api/dorm'
import type { BuildingSave, RoomSave, Id } from '@/api/dorm/types'
import DormPicker from '../components/DormPicker.vue'
import { can, label, useDormDialog } from '../useDorm'
const emit = defineEmits<{ success: [] }>()
const kind = ref<'building' | 'room'>('building')
const editing = ref(false)
const readonly = ref(false)
const formRef = ref<FormInstance>()
const required = [{ required: true, message: '此项必填', trigger: 'change' }]
const initial = () => ({
  building: { name: '', floors: 1, gender: 'UNLIMITED', status: 0 } as BuildingSave,
  room: { roomNo: '', floorNumber: 1, status: 0, bedCount: 4 } as RoomSave,
  resize: false,
  buildingLabel: ''
})
const { visible, loading, saving, ready, data, open: show, close, execute } = useDormDialog(initial)
const open = async (type: 'building' | 'room', id?: Id, view = false) => {
  if (saving.value) return
  kind.value = type
  editing.value = id != null
  readonly.value = view
  await show(
    id == null
      ? undefined
      : async () => {
          const result = initial()
          if (type === 'building') result.building = await Api.building(id)
          else {
            const row = await Api.room(id)
            result.room = { ...row }
            result.buildingLabel = row.buildingName
          }
          return result
        }
  )
  formRef.value?.clearValidate()
}
const submit = async () => {
  const current = data.value
  const permission = `${kind.value}:${editing.value ? 'update' : 'create'}`
  if (
    readonly.value ||
    !can('admin') ||
    !can(permission) ||
    !(await formRef.value?.validate().catch(() => false))
  )
    return
  if (current !== data.value) return
  await execute(
    (v) =>
      kind.value === 'building'
        ? Api.saveBuilding(v.building)
        : Api.saveRoom({
            ...v.room,
            bedCount: !editing.value || v.resize ? v.room.bedCount : undefined
          }),
    permission,
    () => emit('success')
  )
}
defineExpose({ open })
</script>
