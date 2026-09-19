<template>
  <div class="user-page">
    <h2 class="title">
      用户管理
      <el-tag size="small" type="warning">权限演示页</el-tag>
    </h2>

    <!-- 权限状态依赖客户端 localStorage，包在 ClientOnly 中避免 SSR 水合不一致 -->
    <ClientOnly>
      <div class="header-actions">
        <!-- 按钮权限由接口按角色下发（本地 store），v-hasPermi 无权限时直接移除元素 -->
        <el-button v-hasPermi="['action:/system/user:create']" type="primary" @click="onCreate"> 新增用户 </el-button>
        <el-button v-hasPermi="['action:/system/user:export']" type="success" @click="onExport"> 导出用户 </el-button>
      </div>

      <el-table v-loading="loading" :data="users" border stripe class="table" empty-text="暂无用户数据">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column label="头像" width="70">
          <template #default="{ row }">
            <el-avatar :src="row.avatar" :icon="row.avatar ? '' : UserFilled" :size="32" />{{ row.avatar }}
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
            <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">
              {{ row.status === 1 ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="最后登录" min-width="160">
          <template #default="{ row }">
            {{ row.last_login_at ? formatTime(row.last_login_at) : '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220">
          <template #default="{ row }">
            <el-button
              v-hasPermi="['action:/system/user:edit']"
              size="small"
              type="warning"
              @click="onEdit(row as UserListItem)"
            >
              编辑
            </el-button>
            <el-button
              v-hasPermi="['action:/system/user:delete']"
              size="small"
              type="danger"
              @click="onDelete(row as UserListItem)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-alert
        class="tip"
        type="info"
        :closable="false"
        title="权限说明"
        description="页面与按钮权限均由接口按角色下发（/api/public/getInfo + /api/public/getRouters）并缓存到本地，无需页面硬编码：页面访问由全局 permission 中间件按菜单路由表拦截，按钮由 v-hasPermi 指令判定，无权限时直接移除。"
      />

      <p class="meta-tip">
        按钮权限标识来自 permissions 表，如
        <code>action:/system/user:create</code>，可在 /system/role 中按角色分配。
      </p>
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import type { UserListItem } from '~~/types/user';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';

import { UserFilled } from '@element-plus/icons-vue';

const users = ref<UserListItem[]>([]);
const loading = ref(false);

async function fetchUsers() {
  loading.value = true;
  try {
    const res = await $fetch('/api/public/users/list');
    users.value = res.data || [];
  } catch (err) {
    console.error('获取用户列表失败:', err);
    ElMessage.error('获取用户列表失败');
    users.value = [];
  } finally {
    loading.value = false;
  }
}

function formatTime(iso: string) {
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
}

onMounted(fetchUsers);

function onCreate(): void {
  ElMessage.success('打开新增用户弹窗');
}
function onEdit(row: UserListItem): void {
  ElMessage.success(`编辑用户：${row.nickname}`);
}
function onDelete(row: UserListItem): void {
  ElMessage.warning(`删除用户：${row.nickname}`);
}
function onExport(): void {
  ElMessage.success('导出用户列表');
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
