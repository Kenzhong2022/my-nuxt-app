<template>
  <div class="oauth-clients-admin">
    <!-- ==================== 筛选 + 客户端表格（BaseTable：配置化搜索与列） ==================== -->
    <BaseTable
      :table-key="tableKey"
      :show-search="{ items: searchConfig }"
      :columns="columns"
      :show-pagination="false"
      :data="tableData"
      row-key="clientId"
      empty-text="暂无 SSO 客户端，点击右上角「新增」接入应用"
      class="clients-table"
      @search="handleBaseSearch"
      @reset="handleBaseReset"
    >
      <!-- 工具栏：标题 + 总数 + 操作按钮 -->
      <template #toolbar>
        <div class="table-toolbar">
          <div class="toolbar-left">
            <span class="table-title">SSO 白名单</span>
            <el-tag type="primary" effect="plain" size="small" round>共 {{ totalCount }} 项</el-tag>
          </div>

          <div class="toolbar-right">
            <el-button :icon="Refresh" @click="reloadClients">刷新</el-button>
            <el-button type="primary" :icon="Plus" @click="handleCreate">新增</el-button>
          </div>
        </div>
      </template>

      <!-- 自定义列：client_id（等宽字体展示） -->
      <template #clientId="{ row }">
        <span class="client-id-code">{{ row.clientId }}</span>
      </template>

      <!-- 自定义列：回调地址（标签列表，超出省略） -->
      <template #redirectUris="{ row }">
        <div class="uri-cell">
          <el-tag
            v-for="uri in row.redirectUris"
            :key="uri"
            type="info"
            effect="plain"
            size="small"
            class="uri-tag"
          >
            {{ uri }}
          </el-tag>
        </div>
      </template>

      <!-- 自定义列：状态（圆点指示） -->
      <template #enabled="{ row }">
        <span class="status-cell">
          <i class="status-dot" :class="row.enabled ? 'is-on' : 'is-off'" />
          {{ row.enabled ? '启用' : '停用' }}
        </span>
      </template>

      <!-- 自定义列：操作 -->
      <template #actions="{ row }">
        <div class="flex flex-row">
          <el-button link type="primary" :icon="Edit" @click="handleEdit(row as OauthClient)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row as OauthClient)">删除</el-button>
        </div>
      </template>
    </BaseTable>

    <!-- ==================== 新增 / 编辑弹窗 ==================== -->
    <FormDialog
      ref="formDialogRef"
      :title="dialogTitle"
      :schema="formSchema"
      width="560px"
      label-width="104px"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue';
import type { FormSchema, FieldConfig } from '~~/types/dynamicForm';
import type { OauthClient } from '~~/types/oauthClient';
import type { SearchFormItem } from '@/components/BaseTable.vue';
import FormDialog from '@/components/FormDialog.vue';
import BaseTable from '@/components/BaseTable.vue';

/* ==================== 常量映射 ==================== */

/** client_id 合法格式（与后端校验一致：字母/数字开头，仅含字母/数字/-/_，长度 2-64） */
const CLIENT_ID_PATTERN = '^[a-zA-Z0-9][a-zA-Z0-9_-]{1,63}$';

/** 顶部筛选配置（BaseTable showSearch：关键字 / 状态） */
const searchConfig: SearchFormItem[] = [
  {
    label: '关键字',
    prop: 'keyword',
    type: 'input',
    placeholder: '应用名称 / client_id',
    attrs: { style: 'width: 220px' },
  },
  {
    label: '状态',
    prop: 'enabled',
    type: 'select',
    placeholder: '全部',
    options: [
      { label: '启用', value: 1 },
      { label: '停用', value: 0 },
    ],
    attrs: { style: 'width: 140px' },
  },
];

/** 表格列配置（自定义单元格经 slotName 注入，列属性直接透传 el-table-column） */
const columns = [
  { prop: 'clientName', label: '应用名称', minWidth: 160, showOverflowTooltip: true },
  { prop: 'clientId', label: 'client_id', minWidth: 160, showOverflowTooltip: true, slotName: 'clientId' },
  { prop: 'redirectUris', label: '回调地址白名单', minWidth: 320, slotName: 'redirectUris' },
  { prop: 'enabled', label: '状态', width: 100, align: 'center', slotName: 'enabled' },
  { prop: 'createdAt', label: '创建时间', width: 180, align: 'center' },
  { prop: 'actions', label: '操作', width: 150, fixed: 'right', align: 'center', slotName: 'actions' },
];

/** ISO 时间串 → "YYYY-MM-DD HH:mm:ss" */
function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ==================== 筛选状态 ==================== */

/** 已生效的筛选条件（BaseTable 查询/重置回调后同步；编辑态由 BaseTable 表单自持） */
const applied = ref<{ keyword: string; enabled: number | '' }>({ keyword: '', enabled: '' });

/* ==================== 表格状态 ==================== */

/** 全量客户端列表（reloadClients 拉取） */
const rawClients = ref<OauthClient[]>([]);
/** 用于强制重渲染表格，重新筛选时刷新 */
const tableKey = ref(0);
/** 提交进行中（防重复点击） */
const submitting = ref(false);

/* ==================== 计算属性 ==================== */

/** 经过筛选后的列表数据 */
const tableData = computed(() =>
  rawClients.value.filter((client) => {
    const keyword = applied.value.keyword;
    const hitKeyword =
      !keyword || client.clientName.includes(keyword) || client.clientId.includes(keyword);
    const hitEnabled =
      applied.value.enabled === '' || Number(client.enabled) === applied.value.enabled;
    return hitKeyword && hitEnabled;
  }),
);

/** 筛选后条数 */
const totalCount = computed(() => tableData.value.length);

/** 回调地址下拉候选：汇总库中所有客户端已登记的地址（去重排序），供多选复用 */
const redirectUriOptions = computed<{ label: string; value: string }[]>(() => {
  const set = new Set<string>();
  for (const client of rawClients.value) {
    for (const uri of client.redirectUris) set.add(uri);
  }
  return [...set].sort().map((uri) => ({ label: uri, value: uri }));
});

/* ==================== 数据加载 ==================== */

/** 拉取全量客户端列表（刷新按钮 / CRUD 成功后调用） */
async function reloadClients(): Promise<void> {
  const requestFetch = useRequestFetch();
  try {
    const res = await requestFetch<{ code: number; message?: string; data?: OauthClient[] }>(
      '/api/admin/oauth-clients',
    );
    if (res.code !== 200 || !res.data) {
      ElMessage.error(res.message || '获取 SSO 白名单失败');
      return;
    }
    rawClients.value = res.data;
    tableKey.value += 1;
  } catch (err: any) {
    console.error('获取 SSO 白名单失败:', err);
    ElMessage.error(err?.data?.message || '获取 SSO 白名单失败');
  }
}

/* ==================== 筛选交互 ==================== */

/** BaseTable 查询回调：同步生效筛选条件 */
function handleBaseSearch(form: Record<string, any>): void {
  applied.value = {
    keyword: String(form.keyword ?? ''),
    enabled: form.enabled === 0 || form.enabled === 1 ? Number(form.enabled) : '',
  };
  tableKey.value += 1;
}

/** BaseTable 重置回调：清空生效筛选条件 */
function handleBaseReset(): void {
  applied.value = { keyword: '', enabled: '' };
  tableKey.value += 1;
}

/* ==================== 弹窗逻辑（FormDialog 消费方） ==================== */

const formDialogRef = ref<InstanceType<typeof FormDialog>>();

/** 弹窗上下文：当前操作模式与目标行（表单数据本身由 FormDialog 管理） */
const dialogMeta = ref({
  mode: 'create' as 'create' | 'edit',
  /** 编辑时的目标 client_id（用于 PUT 定位；表单 clientId 仅回显） */
  editingId: '',
  editingName: '',
});

/** 弹窗标题：编辑固定为应用名；新增固定文案 */
const dialogTitle = computed(() =>
  dialogMeta.value.mode === 'edit' ? `编辑 - ${dialogMeta.value.editingName}` : '新增 SSO 客户端',
);

/**
 * 弹窗表单配置：
 * - 新增：完整录入 client_id / client_secret / client_name / 回调白名单 / 状态
 * - 编辑：仅回调白名单可改（从库中已有地址勾选），其余字段只读展示
 */
const formSchema = computed<FormSchema>(() => {
  const isEdit = dialogMeta.value.mode === 'edit';
  // 编辑态：除回调白名单外全部只读展示（client_secret 不回显，仅展示占位提示）
  const disabledProp = isEdit ? { disabled: true } : undefined;
  const fields: FieldConfig[] = [
    {
      key: 'clientId',
      type: 'input',
      label: 'client_id',
      placeholder: '应用唯一标识，如 my-app',
      rules: isEdit ? undefined : { required: true, pattern: CLIENT_ID_PATTERN, message: '字母/数字开头，仅含字母/数字/-/_，长度 2-64' },
      props: disabledProp,
    },
    {
      key: 'clientName',
      type: 'input',
      label: '应用名称',
      placeholder: '请输入应用名称',
      rules: isEdit ? undefined : { required: true },
      props: disabledProp,
    },
    {
      key: 'clientSecret',
      type: 'textarea',
      label: 'client_secret',
      placeholder: isEdit ? '不可修改' : '客户端密钥（与认证中心校验一致）',
      rules: isEdit ? undefined : { required: true },
      props: isEdit ? { disabled: true, rows: 2 } : { rows: 3 },
    },
    {
      // 编辑态仅此字段可改：从库中已有地址勾选（不含 allow-create，新增地址走新增客户端流程）
      key: 'redirectUris',
      type: 'multiselect',
      label: '回调地址白名单',
      placeholder: isEdit ? '从已有地址中勾选' : '下拉选择已有地址，或输入新地址后回车创建',
      rules: { required: true, trigger: 'change' },
      options: redirectUriOptions.value,
      props: isEdit ? undefined : { filterable: true, allowCreate: true, defaultFirstOption: true },
    },
    {
      key: 'enabled',
      type: 'radio',
      label: '状态',
      defaultValue: 1,
      props: isEdit ? { disabled: true } : undefined,
      options: [
        { label: '启用', value: 1 },
        { label: '停用', value: 0 },
      ],
    },
  ];
  return { formId: 'oauth-client-form', fields };
});

/**
 * 打开新增弹窗
 */
function handleCreate(): void {
  dialogMeta.value = { mode: 'create', editingId: '', editingName: '' };
  formDialogRef.value?.open({ enabled: 1 });
}

/**
 * 打开编辑弹窗（回填行数据；回调地址回填数组供多选；client_secret 不回显，留空 = 不修改）
 * @param row 行数据（OauthClient）
 */
function handleEdit(row: OauthClient): void {
  dialogMeta.value = { mode: 'edit', editingId: row.clientId, editingName: row.clientName };
  formDialogRef.value?.open({
    clientId: row.clientId,
    clientName: row.clientName,
    clientSecret: '',
    redirectUris: [...row.redirectUris],
    enabled: row.enabled ? 1 : 0,
  });
}

/** 校验单个回调地址是否为 http(s) 绝对 URL */
function isValidUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 接收 FormDialog 校验通过后的表单数据，调用真实接口执行新增/编辑
 * @param data 表单数据（redirectUris 为多选下拉的字符串数组，含新创建项）
 */
async function handleFormSubmit(data: Record<string, any>): Promise<void> {
  if (submitting.value) return;

  const redirectUris = (Array.isArray(data.redirectUris) ? data.redirectUris : [])
    .map((uri: unknown) => String(uri ?? '').trim())
    .filter(Boolean);
  if (redirectUris.length === 0) {
    ElMessage.error('回调地址至少填写一条');
    return;
  }
  const invalidUri = redirectUris.find((uri: string) => !isValidUri(uri));
  if (invalidUri) {
    ElMessage.error(`回调地址格式无效（需 http/https 绝对地址）：${invalidUri}`);
    return;
  }

  const isEdit = dialogMeta.value.mode === 'edit';
  const clientSecret = String(data.clientSecret ?? '').trim();

  const requestFetch = useRequestFetch();
  submitting.value = true;
  try {
    // 编辑只改回调白名单（其余字段服务端忽略，表单也已只读）
    const res = isEdit
      ? await requestFetch<{ code: number; message?: string }>(
          `/api/admin/oauth-clients/${encodeURIComponent(dialogMeta.value.editingId)}`,
          {
            method: 'PUT',
            body: { redirectUris },
          },
        )
      : await requestFetch<{ code: number; message?: string }>('/api/admin/oauth-clients', {
          method: 'POST',
          body: {
            clientId: String(data.clientId ?? '').trim(),
            clientSecret,
            clientName: String(data.clientName ?? '').trim(),
            redirectUris,
            enabled: Number(data.enabled) === 1,
          },
        });

    if (res.code !== 200) {
      ElMessage.error(res.message || (isEdit ? '保存失败' : '新增失败'));
      return;
    }
    ElMessage.success(isEdit ? '保存成功' : '新增成功');
    formDialogRef.value?.close();
    await reloadClients();
  } catch (err: any) {
    console.error('保存 SSO 客户端失败:', err);
    ElMessage.error(err?.data?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

/** 删除 SSO 客户端（确认文案含应用名与 client_id） */
async function handleDelete(row: OauthClient): Promise<void> {
  try {
    await ElMessageBox.confirm(
      `确认删除「${row.clientName}」（${row.clientId}）吗？删除后该应用将无法再单点登录。`,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    );
  } catch {
    return; // 用户取消
  }

  const requestFetch = useRequestFetch();
  try {
    const res = await requestFetch<{ code: number; message?: string }>(
      `/api/admin/oauth-clients/${encodeURIComponent(row.clientId)}`,
      { method: 'DELETE' },
    );
    if (res.code !== 200) {
      ElMessage.error(res.message || '删除失败');
      return;
    }
    ElMessage.success(res.message || '删除成功');
    await reloadClients();
  } catch (err: any) {
    console.error('删除 SSO 客户端失败:', err);
    ElMessage.error(err?.data?.message || '删除失败');
  }
}

/* ==================== 生命周期 ==================== */

onMounted(() => {
  reloadClients();
});
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.oauth-clients-admin {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 16px;
  background-color: var(--el-bg-color-page);
}

/* ==================== BaseTable 高度链 ==================== */
/* 表格纵向撑满剩余空间：wrapper / base-table 两层 flex 链（BaseTable 内部元素，需 :deep） */
.oauth-clients-admin :deep(.base-table-wrapper),
.oauth-clients-admin :deep(.base-table) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

/* ==================== 工具栏（toolbar 插槽内容，页面 scope） ==================== */
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

/* 按钮间距交给 Element 自带的 .el-button + .el-button */
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
.oauth-clients-admin :deep(.clients-table) {
  flex: 1;
  min-height: 0;
}

/* 单元格内容（插槽内容自带页面 scope，无需 :deep） */
.client-id-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.uri-cell {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.uri-tag {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
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
</style>
