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

      <el-table
        v-loading="loading"
        :data="users"
        border
        stripe
        class="table"
        empty-text="暂无用户数据"
      >
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar
              :src="row.avatar"
              :icon="row.avatar ? '' : UserFilled"
              :size="32"
            />{{ row.avatar }}
          </template>
        </el-table-column>
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="email" label="邮箱" min-width="160" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.role_name" type="warning" size="small">
              {{ row.role_name }}
            </el-tag>
            <span v-else class="muted-text">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag
              :type="row.status === 1 ? 'success' : 'danger'"
              size="small"
            >
              {{ row.status === 1 ? "启用" : "禁用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" min-width="160">
          <template #default="{ row }">
            {{ row.last_login_at ? formatTime(row.last_login_at) : "—" }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <PermissionButton
              action="action:system:user:edit"
              size="small"
              type="warning"
              @click="onEdit(row as UserListItem)"
            >
              编辑
            </PermissionButton>
            <PermissionButton
              action="action:system:user:delete"
              size="small"
              type="danger"
              @click="onDelete(row as UserListItem)"
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
        本页声明了
        <code>requiredPermission: 'page:system:user'</code
        >，无该页面权限会被中间件拦截到 /403。
      </p>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { PermissionId } from "~~/types/permission";
import type { UserListItem } from "~~/types/user";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";

import { UserFilled } from "@element-plus/icons-vue";
definePageMeta({
  // 页面级管控：进入本页必须拥有「用户管理」页面权限
  requiredPermission: "page:system:user" as PermissionId,
});

const users = ref<UserListItem[]>([]);
const loading = ref(false);

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await $fetch("/api/public/users/list");
    users.value = res.data || [];
  } catch (err) {
    console.error("获取用户列表失败:", err);
    ElMessage.error("获取用户列表失败");
    users.value = [];
  } finally {
    loading.value = false;
  }
}

function formatTime(iso: string) {
  return dayjs(iso).format("YYYY-MM-DD HH:mm");
}

onMounted(fetchUsers);

const permissionStore = usePermissionStore();
const canCreate = computed(() =>
  permissionStore.hasPermission("action:system:user:create" as PermissionId),
);

function onCreate(): void {
  ElMessage.success("打开新增用户弹窗");
}
function onEdit(row: UserListItem): void {
  ElMessage.success(`编辑用户：${row.nickname}`);
}
function onDelete(row: UserListItem): void {
  ElMessage.warning(`删除用户：${row.nickname}`);
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

.muted-text {
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
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
