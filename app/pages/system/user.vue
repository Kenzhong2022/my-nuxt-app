<template>
  <div class="user-page">
    <h2 class="title">
      用户管理
      <el-tag size="small" type="warning">权限演示页</el-tag>
    </h2>

    <!-- 权限状态依赖客户端 localStorage，包在 ClientOnly 中避免 SSR 水合不一致 -->
    <ClientOnly>
      <div class="header-actions">
        <PermissionButton
          action="action:system:user:create"
          type="primary"
          @click="onCreate"
        >
          新增用户
        </PermissionButton>
        <PermissionButton
          action="action:system:user:export"
          type="success"
          @click="onExport"
        >
          导出用户
        </PermissionButton>
      </div>

      <el-table :data="users" border stripe class="table">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="role" label="角色" />
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <PermissionButton
              action="action:system:user:edit"
              size="small"
              type="warning"
              @click="onEdit(row)"
            >
              编辑
            </PermissionButton>
            <PermissionButton
              action="action:system:user:delete"
              size="small"
              type="danger"
              @click="onDelete(row)"
            >
              删除
            </PermissionButton>
          </template>
        </el-table-column>
      </el-table>

      <el-alert
        v-if="!canCreate"
        class="tip"
        type="info"
        :closable="false"
        title="权限提示"
        description="你当前没有「新增用户」权限，上方按钮被禁用。前往 /admin/permissions 勾选 action:system:user:create 并保存即可。"
      />
      <el-alert
        v-else
        class="tip"
        type="success"
        :closable="false"
        title="权限提示"
        description="你已拥有「新增用户」权限，按钮可用。"
      />

      <p class="meta-tip">
        本页声明了 <code>requiredPermission: 'page:system:user'</code>，无该页面权限会被中间件拦截到 /403。
      </p>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { PermissionId } from "~~/types/permission";
import { ElMessage } from "element-plus";

definePageMeta({
  // 页面级管控：进入本页必须拥有「用户管理」页面权限
  requiredPermission: "page:system:user" as PermissionId,
});

interface UserRow {
  id: number;
  name: string;
  role: string;
}

const users = ref<UserRow[]>([
  { id: 1, name: "张三", role: "管理员" },
  { id: 2, name: "李四", role: "运营" },
  { id: 3, name: "王五", role: "访客" },
]);

const permissionStore = usePermissionStore();
const canCreate = computed(() =>
  permissionStore.hasPermission("action:system:user:create" as PermissionId),
);

function onCreate(): void {
  ElMessage.success("打开新增用户弹窗");
}
function onEdit(row: UserRow): void {
  ElMessage.success(`编辑用户：${row.name}`);
}
function onDelete(row: UserRow): void {
  ElMessage.warning(`删除用户：${row.name}`);
}
function onExport(): void {
  ElMessage.success("导出用户列表");
}
</script>

<style scoped>
.user-page {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.title {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.table {
  background: var(--el-bg-color);
}

.tip {
  margin-top: 16px;
}

.meta-tip {
  margin-top: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.meta-tip code {
  padding: 1px 4px;
  border-radius: 3px;
  background: var(--el-fill-color);
  color: var(--el-color-primary);
}
</style>
