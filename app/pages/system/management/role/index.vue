<template>
  <div class="user-admin">
    <!-- ==================== 筛选 + 用户表格（BaseTable：配置化搜索与列） ==================== -->
    <BaseTable
      :show-search="{ items: searchConfig }"
      :columns="columns"
      :show-pagination="true"
      :page="page"
      :page-size="pageSize"
      :total="total"
      :loading="loading"
      :data="users"
      row-key="id"
      empty-text="暂无用户数据"
      class="user-table"
      @search="handleBaseSearch"
      @reset="handleBaseReset"
      @page-change="handlePageChange"
      @size-change="handleSizeChange"
    >
      <!-- 工具栏：标题 + 总数 + 操作按钮 -->
      <template #toolbar>
        <div class="table-toolbar">
          <div class="toolbar-left">
            <span class="table-title">用户列表</span>
            <el-tag type="primary" effect="plain" size="small" round>共 {{ total }} 人</el-tag>
          </div>

          <div class="toolbar-right">
            <el-button :icon="Refresh" @click="loadUsers">刷新</el-button>
            <el-button type="primary" :icon="Plus" @click="handleCreate">新增用户</el-button>
          </div>
        </div>
      </template>

      <!-- 自定义列：用户（头像 + 昵称 + uuid） -->
      <template #user="{ row }">
        <div class="user-cell">
          <el-avatar :size="32" :src="row.avatar || undefined">
            {{ avatarText(row as UserItem) }}
          </el-avatar>
          <div class="user-meta">
            <span class="user-name">{{ row.nickname || '未设置昵称' }}</span>
            <span class="user-uuid">{{ row.uuid }}</span>
          </div>
        </div>
      </template>

      <!-- 自定义列：角色（联表 roles 返回） -->
      <template #role="{ row }">
        <el-tag v-if="row.role" :type="roleTagType(row.role.code)" effect="plain" size="small" round>
          {{ row.role.name }}
        </el-tag>
        <span v-else class="text-muted">未分配</span>
      </template>

      <!-- 自定义列：状态（圆点指示） -->
      <template #status="{ row }">
        <span class="status-cell">
          <i class="status-dot" :class="row.status === 1 ? 'is-on' : 'is-off'" />
          {{ row.status === 1 ? '启用' : '禁用' }}
        </span>
      </template>

      <!-- 自定义列：最后登录（可空） -->
      <template #lastLogin="{ row }">
        <span :class="{ 'text-muted': !row.lastLoginAt }">{{ formatDateTime(row.lastLoginAt) }}</span>
      </template>

      <!-- 自定义列：操作 -->
      <template #actions="{ row }">
        <div class="flex flex-row">
          <el-button link type="primary" :icon="Edit" @click="handleEdit(row as UserItem)">编辑</el-button>

          <el-button link type="warning" :icon="Key" @click="handleResetPassword(row as UserItem)">
            重置密码
          </el-button>

          <el-button link type="danger" :icon="Delete" @click="handleDelete(row as UserItem)">删除</el-button>
        </div>
      </template>
    </BaseTable>

    <!-- ==================== 新增 / 编辑弹窗 ==================== -->
    <FormDialog
      ref="formDialogRef"
      :title="dialogTitle"
      :schema="formSchema"
      width="560px"
      label-width="88px"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Key, Plus, Refresh } from '@element-plus/icons-vue';
import type { FormSchema, FieldConfig, FieldOption } from '~~/types/dynamicForm';
import type { SearchFormItem } from '@/components/BaseTable.vue';
import FormDialog from '@/components/FormDialog.vue';
import BaseTable from '@/components/BaseTable.vue';

/* ==================== 类型定义 ==================== */

/** 角色（联表 roles 精简字段） */
interface UserRole {
  id: number;
  name: string;
  code: string;
}

/** 用户行数据（users 主表 + 联表 role） */
interface UserItem {
  /** users.id（BIGSERIAL，row-key） */
  id: number;
  /** users.uuid（对外暴露，前端展示用） */
  uuid: string;
  email: string;
  phone: string | null;
  nickname: string | null;
  avatar: string | null;
  /** 1 启用 / 0 禁用 */
  status: 0 | 1;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** 联表返回的角色对象（未分配为 null） */
  role: UserRole | null;
}

/* ==================== 常量映射 ==================== */

const STATUS_OPTIONS = [
  { label: '启用', value: 1 },
  { label: '禁用', value: 0 },
];

/** 角色标签配色（按 code 命中，未命中走默认） */
const ROLE_TAG_MAP: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'info'> = {
  super_admin: 'danger',
  admin: 'warning',
  operator: 'primary',
  viewer: 'info',
};

function roleTagType(code: string) {
  return ROLE_TAG_MAP[code] ?? 'info';
}

/* ==================== 基础工具 ==================== */

/** ISO 时间串 → "YYYY-MM-DD HH:mm:ss"，空值返回 '—' */
function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 头像兜底文案：昵称 / 邮箱首字母 */
function avatarText(row: UserItem): string {
  const source = row.nickname || row.email || '';
  return source.charAt(0).toUpperCase() || '?';
}

/* ==================== 筛选配置 ==================== */

/** 角色下拉选项（onMounted 拉取，供筛选与表单复用） */
const roleOptions = ref<FieldOption[]>([]);

/** 顶部筛选配置（关键词 / 角色 / 状态） */
const searchConfig = computed<SearchFormItem[]>(() => [
  {
    label: '关键词',
    prop: 'keyword',
    type: 'input',
    placeholder: '昵称 / 邮箱 / 手机号',
    attrs: { style: 'width: 220px' },
  },
  {
    label: '角色',
    prop: 'roleId',
    type: 'select',
    placeholder: '全部',
    options: roleOptions.value,
    attrs: { style: 'width: 160px' },
  },
  {
    label: '状态',
    prop: 'status',
    type: 'select',
    placeholder: '全部',
    options: [...STATUS_OPTIONS],
    attrs: { style: 'width: 140px' },
  },
]);

/* ==================== 表格列配置 ==================== */

/** 表格列（自定义单元格经 slotName 注入，列属性直接透传 el-table-column） */
const columns = [
  { prop: 'nickname', label: '用户', minWidth: 220, slotName: 'user' },
  { prop: 'email', label: '邮箱', minWidth: 200, showOverflowTooltip: true },
  { prop: 'phone', label: '手机号', width: 140, align: 'center' },
  { prop: 'role', label: '角色', width: 140, align: 'center', slotName: 'role' },
  { prop: 'status', label: '状态', width: 100, align: 'center', slotName: 'status' },
  { prop: 'lastLoginAt', label: '最后登录', width: 180, align: 'center', slotName: 'lastLogin' },
  { prop: 'createdAt', label: '创建时间', width: 180, align: 'center' },
  { prop: 'actions', label: '操作', width: 220, fixed: 'right', align: 'center', slotName: 'actions' },
];

/* ==================== 列表状态 ==================== */

/** 已生效的筛选条件（BaseTable 查询/重置回调后同步） */
const applied = ref<{
  keyword: string;
  roleId: number | '';
  status: number | '';
}>({
  keyword: '',
  roleId: '',
  status: '',
});

const users = ref<UserItem[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);

/* ==================== 数据加载 ==================== */

/** 拉取用户列表（联表 roles，返回 { list, total }） */
async function loadUsers(): Promise<void> {
  loading.value = true;
  const requestFetch = useRequestFetch();
  try {
    const res = await requestFetch<{
      code: number;
      message?: string;
      data?: { list: UserItem[]; total: number };
    }>('/api/admin/users', {
      method: 'GET',
      query: {
        keyword: applied.value.keyword || undefined,
        roleId: applied.value.roleId || undefined,
        // status=0 是合法值，不能被 falsy 判断吞掉
        status: applied.value.status === '' ? undefined : applied.value.status,
        page: page.value,
        pageSize: pageSize.value,
      },
    });

    if (res.code !== 200) {
      ElMessage.error(res.message || '加载用户列表失败');
      return;
    }
    users.value = res.data?.list ?? [];
    total.value = res.data?.total ?? 0;
  } catch (err: any) {
    console.error('加载用户列表失败:', err);
    ElMessage.error(err?.data?.message || '加载用户列表失败');
  } finally {
    loading.value = false;
  }
}

/** 拉取角色下拉（供筛选与表单共用） */
async function loadRoles(): Promise<void> {
  const requestFetch = useRequestFetch();
  try {
    const res = await requestFetch<{
      code: number;
      data?: Array<{ id: number; name: string; code: string }>;
    }>('/api/admin/roles', {
      method: 'GET',
      query: { page: 1, pageSize: 200, status: 1 },
    });
    if (res.code !== 200) return;
    roleOptions.value = (res.data ?? []).map((r) => ({ label: r.name, value: r.id }));
  } catch (err) {
    console.error('加载角色列表失败:', err);
  }
}

/* ==================== 筛选 / 分页交互 ==================== */

function handleBaseSearch(form: Record<string, any>): void {
  applied.value = {
    keyword: String(form.keyword ?? '').trim(),
    roleId: form.roleId === undefined || form.roleId === null || form.roleId === '' ? '' : Number(form.roleId),
    status: form.status === undefined || form.status === null || form.status === '' ? '' : Number(form.status),
  };
  page.value = 1;
  loadUsers();
}

function handleBaseReset(): void {
  applied.value = { keyword: '', roleId: '', status: '' };
  page.value = 1;
  loadUsers();
}

function handlePageChange(nextPage: number, nextSize: number): void {
  page.value = nextPage;
  pageSize.value = nextSize;
  loadUsers();
}

function handleSizeChange(nextSize: number): void {
  pageSize.value = nextSize;
  page.value = 1;
  loadUsers();
}

/* ==================== 弹窗逻辑 ==================== */

const formDialogRef = ref<InstanceType<typeof FormDialog>>();

const dialogMeta = reactive({
  mode: 'create' as 'create' | 'edit',
  editingId: 0,
  editingLabel: '',
});

const dialogTitle = computed(() => (dialogMeta.mode === 'edit' ? `编辑用户 - ${dialogMeta.editingLabel}` : '新增用户'));

/**
 * 弹窗表单配置
 * - 新增：昵称 / 邮箱 / 手机号 / 密码（必填）/ 角色 / 头像 / 状态
 * - 编辑：隐藏「密码」（走独立的「重置密码」入口），其余字段回显可改；邮箱允许改（后端做唯一校验）
 * - uuid / last_login_at / created_at 等系统字段不参与表单
 */
const formSchema = computed<FormSchema>(() => {
  const isEdit = dialogMeta.mode === 'edit';

  const fields: FieldConfig[] = [
    {
      key: 'nickname',
      type: 'input',
      label: '昵称',
      placeholder: '请输入昵称',
      rules: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
    },
    {
      key: 'email',
      type: 'input',
      label: '邮箱',
      placeholder: '请输入邮箱',
      rules: [
        { required: true, message: '请输入邮箱', trigger: 'blur' },
        { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
      ],
    },
    {
      key: 'phone',
      type: 'input',
      label: '手机号',
      placeholder: '请输入手机号（可选）',
      rules: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
    },
    {
      key: 'roleId',
      type: 'select',
      label: '所属角色',
      options: roleOptions.value,
      placeholder: '请选择角色',
      rules: [{ required: true, message: '请选择角色', trigger: 'change' }],
    },
    {
      key: 'avatar',
      type: 'input',
      label: '头像地址',
      placeholder: '请输入头像 URL（可选）',
    },
    {
      key: 'status',
      type: 'radio',
      label: '状态',
      defaultValue: 1,
      options: [...STATUS_OPTIONS],
    },
  ];

  // 密码仅新增时录入（编辑走「重置密码」独立入口，避免误改）
  if (!isEdit) {
    fields.splice(3, 0, {
      key: 'password',
      type: 'input',
      label: '登录密码',
      placeholder: '请输入密码（至少 6 位）',
      rules: [
        { required: true, message: '请输入密码', trigger: 'blur' },
        { min: 6, message: '密码至少 6 位', trigger: 'blur' },
      ],
      props: { showPassword: true },
    });
  }

  return { formId: 'user-form', fields };
});

/** 打开新增弹窗 */
function handleCreate(): void {
  dialogMeta.mode = 'create';
  dialogMeta.editingId = 0;
  dialogMeta.editingLabel = '';
  formDialogRef.value?.open({
    nickname: '',
    email: '',
    phone: '',
    password: '',
    roleId: undefined,
    avatar: '',
    status: 1,
  });
}

/** 打开编辑弹窗（回填行数据，含联表角色 id） */
function handleEdit(row: UserItem): void {
  dialogMeta.mode = 'edit';
  dialogMeta.editingId = row.id;
  dialogMeta.editingLabel = row.nickname || row.email;
  formDialogRef.value?.open({
    nickname: row.nickname ?? '',
    email: row.email,
    phone: row.phone ?? '',
    roleId: row.role?.id,
    avatar: row.avatar ?? '',
    status: row.status,
  });
}

/* ==================== 表单提交 ==================== */

/** 提交进行中（防重复点击） */
const submitting = ref(false);

async function handleFormSubmit(data: Record<string, any>): Promise<void> {
  if (submitting.value) return;

  const requestFetch = useRequestFetch();
  const nickname = String(data.nickname ?? '').trim();
  const email = String(data.email ?? '').trim();
  const phone = String(data.phone ?? '').trim();
  const avatar = String(data.avatar ?? '').trim() || null;
  const roleId = Number(data.roleId);
  const status = Number(data.status) === 0 ? 0 : 1;

  if (!nickname || !email) {
    ElMessage.error('昵称与邮箱为必填项');
    return;
  }
  if (!roleId) {
    ElMessage.error('请选择所属角色');
    return;
  }

  submitting.value = true;
  try {
    if (dialogMeta.mode === 'create') {
      const password = String(data.password ?? '');
      if (password.length < 6) {
        ElMessage.error('密码至少 6 位');
        return;
      }

      const res = await requestFetch<{ code: number; message?: string }>('/api/admin/users', {
        method: 'POST',
        body: { nickname, email, phone: phone || null, password, roleId, avatar, status },
      });
      if (res.code !== 200) {
        ElMessage.error(res.message || '新增失败');
        return;
      }
      ElMessage.success('新增成功');
    } else {
      // 编辑：不提交 password（走重置密码接口）；uuid/created_at 等系统字段不可改
      const res = await requestFetch<{ code: number; message?: string }>(`/api/admin/users/${dialogMeta.editingId}`, {
        method: 'PUT',
        body: { nickname, email, phone: phone || null, roleId, avatar, status },
      });
      if (res.code !== 200) {
        ElMessage.error(res.message || '保存失败');
        return;
      }
      ElMessage.success('保存成功');
    }

    formDialogRef.value?.close();
    await loadUsers();
  } catch (err: any) {
    console.error('保存用户失败:', err);
    ElMessage.error(err?.data?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

/* ==================== 重置密码 ==================== */

/** 重置密码：独立入口，避免编辑表单误改密码 */
async function handleResetPassword(row: UserItem): Promise<void> {
  try {
    const { value } = await ElMessageBox.prompt(
      `请输入「${row.nickname || row.email}」的新密码（至少 6 位）`,
      '重置密码',
      {
        confirmButtonText: '确认重置',
        cancelButtonText: '取消',
        inputType: 'password',
        inputPlaceholder: '请输入新密码',
        inputValidator: (val: string) => (val && val.length >= 6 ? true : '密码至少 6 位'),
      },
    );

    const requestFetch = useRequestFetch();
    const res = await requestFetch<{ code: number; message?: string }>(`/api/admin/users/${row.id}/password`, {
      method: 'PUT',
      body: { password: value },
    });
    if (res.code !== 200) {
      ElMessage.error(res.message || '重置密码失败');
      return;
    }
    ElMessage.success('密码已重置');
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return; // 用户取消
    console.error('重置密码失败:', err);
    ElMessage.error(err?.data?.message || '重置密码失败');
  }
}

/* ==================== 删除 ==================== */

/** 删除用户（后端走 deleted_at 软删除） */
async function handleDelete(row: UserItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除用户「${row.nickname || row.email}」吗？删除后该账号将无法登录。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    });
  } catch {
    return; // 用户取消
  }

  const requestFetch = useRequestFetch();
  try {
    const res = await requestFetch<{ code: number; message?: string }>(`/api/admin/users/${row.id}`, {
      method: 'DELETE',
    });
    if (res.code !== 200) {
      ElMessage.error(res.message || '删除失败');
      return;
    }
    ElMessage.success(res.message || '删除成功');

    // 删除当前页最后一条时回退一页，避免空页
    if (users.value.length === 1 && page.value > 1) page.value -= 1;
    await loadUsers();
  } catch (err: any) {
    console.error('删除用户失败:', err);
    ElMessage.error(err?.data?.message || '删除失败');
  }
}

/* ==================== 生命周期 ==================== */

onMounted(() => {
  loadRoles();
  loadUsers();
});
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.user-admin {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 16px;
  background-color: var(--el-bg-color-page);
}

/* ==================== BaseTable 高度链 ==================== */
.user-admin :deep(.base-table-wrapper),
.user-admin :deep(.base-table) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

/* ==================== 工具栏 ==================== */
.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: 8px;
}

.table-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* ==================== 表格 ==================== */
.user-admin :deep(.user-table) {
  flex: 1;
  min-height: 0;
}

/* 单元格内容（插槽内容自带页面 scope，无需 :deep） */
.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.3;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-uuid {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--el-color-info);
}

.status-dot.is-on {
  background-color: var(--el-color-success);
}

.status-dot.is-off {
  background-color: var(--el-color-info);
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
