<template>
  <ContentWrap>
    <el-form
      :inline="true"
      :model="params"
      class="-mb-15px"
      label-width="68px"
      @submit.prevent="search"
    >
      <el-form-item v-if="kind === 'room'" label="楼栋"
        ><DormPicker v-model="params.buildingId" kind="building" class="!w-240px"
      /></el-form-item>
      <el-form-item :label="kind === 'room' ? '房间号' : '楼栋名'"
        ><el-input
          v-model="params.keyword"
          clearable
          maxlength="100"
          class="!w-240px"
          @keyup.enter="search"
      /></el-form-item>
      <el-form-item
        ><el-button @click="search"><Icon icon="ep:search" class="mr-5px" />搜索</el-button
        ><el-button @click="reset"><Icon icon="ep:refresh" class="mr-5px" />重置</el-button
        ><el-button
          v-if="can('admin') && can(`${kind}:create`)"
          type="primary"
          plain
          @click="formRef?.open(kind)"
          ><Icon icon="ep:plus" class="mr-5px" />新增</el-button
        ></el-form-item
      >
    </el-form>
  </ContentWrap>
  <ContentWrap>
    <ListState :failed="failed" @retry="load" />
    <el-table v-loading="loading" :data="rows">
      <el-table-column
        prop="name"
        :label="kind === 'building' ? '楼栋名称' : '楼栋 / 房间'"
        min-width="180"
        show-overflow-tooltip
      />
      <el-table-column label="性别限制" width="110"
        ><template #default="{ row }">{{ label(row.gender) }}</template></el-table-column
      >
      <el-table-column
        prop="floor"
        :label="kind === 'building' ? '楼层数' : '所在楼层'"
        width="100"
      />
      <el-table-column v-if="kind === 'room'" label="床位 / 已分配 / 已入住" min-width="200"
        ><template #default="{ row }"
          >{{ row.bedCount }} / {{ row.allocatedCount }} / {{ row.occupiedCount }}</template
        ></el-table-column
      >
      <el-table-column label="状态" width="90"
        ><template #default="{ row }"
          ><el-tag :type="row.status === 0 ? 'success' : 'info'">{{
            row.status === 0 ? '启用' : '停用'
          }}</el-tag></template
        ></el-table-column
      >
      <el-table-column label="操作" width="250" fixed="right"
        ><template #default="{ row }">
          <el-button link type="primary" @click="formRef?.open(kind, row.id, true)">详情</el-button>
          <el-button
            v-if="kind === 'room' && can('room:query')"
            link
            type="primary"
            @click="bedRef?.open(row.id)"
            >床位</el-button
          >
          <el-button
            v-if="can('admin') && can(`${kind}:update`)"
            link
            type="primary"
            @click="formRef?.open(kind, row.id)"
            >修改</el-button
          >
          <el-button
            v-if="can('admin') && can(`${kind}:delete`)"
            link
            type="danger"
            :disabled="deleting"
            @click="remove(row)"
            >删除</el-button
          >
        </template></el-table-column
      >
    </el-table>
    <Pagination
      v-model:page="params.pageNo"
      v-model:limit="params.pageSize"
      :total="total"
      :page-sizes="[10, 20, 50, 100]"
      @pagination="load"
    />
  </ContentWrap>
  <ResourceForm ref="formRef" @success="load" /><BedDialog ref="bedRef" @success="load" />
</template>
<script setup lang="ts">
import { ElMessage } from 'element-plus'
import * as Api from '@/api/dorm'
import type { Query, Version } from '@/api/dorm/types'
import { can, label, query, useDormList, version, confirmAction } from '../useDorm'
import DormPicker from '../components/DormPicker.vue'
import ListState from '../components/ListState.vue'
import ResourceForm from './ResourceForm.vue'
import BedDialog from './BedDialog.vue'
const props = defineProps<{ kind: 'building' | 'room' }>()
const params = reactive(query())
interface ResourceRow extends Version {
  name: string
  floor: number
  gender: string
  status: number
  bedCount?: number
  allocatedCount?: number
  occupiedCount?: number
}
const read = async (q: Query): Promise<PageResult<ResourceRow[]>> => {
  if (props.kind === 'building') {
    const r = await Api.buildings(q)
    return {
      ...r,
      list: r.list.map((b) => ({
        ...b,
        floor: b.floors,
        bedCount: undefined as number | undefined,
        allocatedCount: undefined as number | undefined,
        occupiedCount: undefined as number | undefined
      }))
    }
  }
  const r = await Api.rooms(q)
  return {
    ...r,
    list: r.list.map((r) => ({
      ...r,
      name: `${r.buildingName} / ${r.roomNo}`,
      floor: r.floorNumber
    }))
  }
}
const { rows, total, loading, failed, load, search, reset } = useDormList(
  params,
  read,
  `${props.kind}:query`
)
const formRef = ref<InstanceType<typeof ResourceForm>>()
const bedRef = ref<InstanceType<typeof BedDialog>>()
const deleting = ref(false)
const remove = async (row: Version) => {
  if (deleting.value || !can('admin') || !can(`${props.kind}:delete`)) return
  if (!(await confirmAction('确认删除？已有历史引用的资源只能停用。')) || deleting.value) return
  deleting.value = true
  try {
    await (props.kind === 'building'
      ? Api.deleteBuilding(version(row))
      : Api.deleteRoom(version(row)))
    ElMessage.success('删除成功')
    await load()
  } catch {
    return
  } finally {
    deleting.value = false
  }
}
</script>
