<template>
  <div class="menu-admin">
    <!-- ==================== 顶部筛选区 ==================== -->
    <el-card class="filter-card" shadow="never">
      <el-form class="filter-form" :model="filters" inline @submit.prevent>
        <el-form-item label="菜单名称">
          <el-input
            v-model="filters.keyword"
            placeholder="菜单名称 / 权限标识"
            clearable
            style="width: 220px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>

        <el-form-item label="类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="opt in TYPE_OPTIONS" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>

        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 140px">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button :icon="RefreshLeft" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- ==================== 底部菜单表格 ==================== -->
    <el-card class="table-card" shadow="never">
      <!-- 工具栏 -->
      <div class="table-toolbar">
        <div class="toolbar-left">
          <span class="table-title">菜单列表</span>
          <el-tag type="primary" effect="plain" size="small" round>共 {{ totalCount }} 项</el-tag>
        </div>

        <div class="toolbar-right">
          <el-button :icon="Sort" @click="toggleExpandAll">
            {{ expandAll ? '收起全部' : '展开全部' }}
          </el-button>
          <el-button :icon="Refresh" @click="fetchMenus">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="handleCreate()">新增</el-button>
        </div>
      </div>

      <!-- 树形表格 -->
      <el-table
        :key="tableKey"
        v-loading="loading"
        :data="tableData"
        row-key="id"
        :tree-props="{ children: 'children' }"
        :default-expand-all="expandAll"
        border
        stripe
        class="menu-table"
      >
        <el-table-column prop="label" label="菜单名称" min-width="200" show-overflow-tooltip />

        <el-table-column prop="id" label="权限标识" min-width="240" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="perm-code">{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="sort" label="排序" width="80" align="center" />

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <span class="status-cell">
              <i class="status-dot" :class="row.status === 1 ? 'is-on' : 'is-off'" />
              {{ row.status === 1 ? '启用' : '禁用' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column prop="createTime" label="创建时间" width="180" align="center" />

        <!-- 右侧操作列 -->
        <el-table-column label="操作" width="230" fixed="right" align="center">
          <template #default="{ row }">
            <el-button
              v-if="row.type !== 'action'"
              link
              type="primary"
              :icon="Plus"
              @click="handleCreate(row as MenuItem)"
            >
              新增子项
            </el-button>

            <el-button link type="primary" :icon="Edit" @click="handleEdit(row as MenuItem)">编辑</el-button>

            <el-button link type="danger" :icon="Delete" @click="handleDelete(row as MenuItem)">删除</el-button>
          </template>
        </el-table-column>

        <template #empty>
          <el-empty description="暂无菜单数据" :image-size="90" />
        </template>
      </el-table>
    </el-card>

    <!-- ==================== 新增 / 编辑弹窗（表单配置由父组件下发，随类型 radio 联动） ==================== -->
    <FormDialog
      ref="formDialogRef"
      :title="dialogTitle"
      :schema="formSchema"
      width="520px"
      label-width="88px"
      @field-change="handleFieldChange"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Edit, Plus, Refresh, RefreshLeft, Search, Sort } from '@element-plus/icons-vue';
import type { FormSchema, FieldConfig } from '~~/types/dynamicForm';
import FormDialog from '@/components/FormDialog.vue';

/* ==================== 类型定义 ==================== */

type MenuType = 'module' | 'page' | 'action';

/** 菜单节点（树形结构，与后端约定字段） */
interface MenuItem {
  /** 权限标识，全局唯一（目录通常无，由后端兜底生成） */
  id: string;
  /** 显示名称 */
  label: string;
  /** 节点类型：目录 / 菜单 / 按钮 */
  type: MenuType;
  /** 路由地址（目录 / 菜单） */
  path?: string;
  /** 菜单图标（目录 / 菜单） */
  icon?: string;
  /** 排序值 */
  sort: number;
  /** 状态：1 启用，0 禁用 */
  status: 0 | 1;
  /** 创建时间 */
  createTime: string;
  /** 子节点 */
  children?: MenuItem[];
}

/** 后端菜单列表返回结构 */
interface MenuListResponse {
  code: number;
  message: string;
  data: MenuItem[];
}

/* ==================== 常量映射 ==================== */

const TYPE_OPTIONS = [
  { label: '目录', value: 'module' },
  { label: '菜单', value: 'page' },
  { label: '按钮', value: 'action' },
] as const;

const TYPE_TEXT: Record<MenuType, string> = {
  module: '目录',
  page: '菜单',
  action: '按钮',
};

/* ==================== 筛选状态 ==================== */

/** 表单里正在编辑的筛选条件 */
const filters = reactive<{
  keyword: string;
  type: MenuType | '';
  status: number | '';
}>({
  keyword: '',
  type: '',
  status: '',
});

/** 真正生效的筛选条件（点击「查询」后才同步） */
const applied = ref<{
  keyword: string;
  type: MenuType | '';
  status: number | '';
}>({
  keyword: '',
  type: '',
  status: '',
});

/* ==================== 表格状态 ==================== */

/** 原始树数据（API 返回） */
const rawMenus = ref<MenuItem[]>([]);
/** 表格加载态 */
const loading = ref(false);
/** 是否默认展开全部 */
const expandAll = ref(true);
/** 用于强制重渲染表格，切换展开态 / 重新筛选时刷新 */
const tableKey = ref(0);

/* ==================== 计算属性 ==================== */

/** 经过筛选后的树数据 */
const tableData = computed(() =>
  filterTree(rawMenus.value, applied.value.keyword, applied.value.type, applied.value.status),
);

/** 筛选后节点总数（含子节点） */
const totalCount = computed(() => countNodes(tableData.value));

/* ==================== 工具函数 ==================== */

/**
 * 递归筛选菜单树
 * @description 节点自身命中，或任一子节点命中，则保留该节点
 */
function filterTree(list: MenuItem[], keyword: string, type: MenuType | '', status: number | ''): MenuItem[] {
  const result: MenuItem[] = [];

  for (const node of list) {
    const children = node.children ? filterTree(node.children, keyword, type, status) : [];

    const selfMatch =
      (!keyword || node.label.includes(keyword) || node.id.includes(keyword)) &&
      (!type || node.type === type) &&
      (status === '' || node.status === status);

    if (selfMatch || children.length > 0) {
      result.push({
        ...node,
        children: children.length > 0 ? children : undefined,
      });
    }
  }

  return result;
}

/** 递归统计节点数量 */
function countNodes(list: MenuItem[]): number {
  return list.reduce((total, node) => total + 1 + (node.children ? countNodes(node.children) : 0), 0);
}

/** 递归查找节点 */
function findNode(list: MenuItem[], id: string): MenuItem | null {
  for (const node of list) {
    if (node.id === id) return node;
    if (node.children) {
      const hit = findNode(node.children, id);
      if (hit) return hit;
    }
  }
  return null;
}

/** 递归删除节点 */
function removeNode(list: MenuItem[], id: string): boolean {
  const index = list.findIndex((node) => node.id === id);
  if (index > -1) {
    list.splice(index, 1);
    return true;
  }
  return list.some((node) => (node.children ? removeNode(node.children, id) : false));
}

/** 简易时间格式化 */
function formatNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ==================== 数据请求 ==================== */

/**
 * 拉取菜单列表
 * @description 请求 /api/public/menus/list，返回按 sort_order 排序的全量菜单树（含禁用项）
 */
async function fetchMenus(): Promise<void> {
  loading.value = true;
  try {
    const res = await $fetch<MenuListResponse>('/api/public/menus/list');
    rawMenus.value = res.data ?? [];
    tableKey.value += 1;
  } catch (err) {
    console.error('获取菜单列表失败:', err);
    ElMessage.error('获取菜单列表失败');
  } finally {
    loading.value = false;
  }
}

/* ==================== 筛选交互 ==================== */

/** 执行查询 */
function handleSearch(): void {
  applied.value = {
    keyword: filters.keyword.trim(),
    type: filters.type,
    status: filters.status,
  };
  tableKey.value += 1;
}

/** 重置筛选条件 */
function handleReset(): void {
  filters.keyword = '';
  filters.type = '';
  filters.status = '';
  handleSearch();
}

/** 切换展开 / 收起全部 */
function toggleExpandAll(): void {
  expandAll.value = !expandAll.value;
  tableKey.value += 1;
}

/* ==================== 弹窗逻辑（FormDialog 消费方） ==================== */
const formDialogRef = ref<InstanceType<typeof FormDialog>>();

/** 弹窗上下文：当前操作模式与目标节点（表单数据本身由 FormDialog 管理） */
const dialogMeta = reactive({
  mode: 'create' as 'create' | 'edit',
  /** 当前选中的菜单类型（随弹窗内 radio 切换更新，驱动 schema 与标题联动） */
  currentType: 'page' as MenuType,
  /** 上级菜单 id，空字符串表示根节点 */
  parentId: '',
  parentLabel: '根目录',
  /** 编辑时的原始 id，用于定位节点（表单 id 可能被改动） */
  editingId: '',
  editingLabel: '',
});

/** 弹窗标题：编辑固定为节点名；新增随类型 radio 联动（新增目录/菜单/按钮） */
const dialogTitle = computed(() => {
  if (dialogMeta.mode === 'edit') return `编辑 - ${dialogMeta.editingLabel}`;
  const typeLabel = TYPE_TEXT[dialogMeta.currentType];
  return dialogMeta.parentId ? `在「${dialogMeta.parentLabel}」下新增${typeLabel}` : `新增${typeLabel}`;
});

/** 弹窗表单配置：随「菜单类型」radio 联动
 * - 目录：名称 + 路由地址 + 图标
 * - 菜单：名称 + 路由地址 + 权限标识(选填) + 图标
 * - 按钮：名称 + 权限标识(必填)
 */
const formSchema = computed<FormSchema>(() => {
  const type = dialogMeta.currentType;
  const labelName = { module: '目录名称', page: '菜单名称', action: '按钮名称' }[type];
  const fields: FieldConfig[] = [
    { key: 'parentLabel', type: 'input', label: '上级菜单', props: { disabled: true } },
    {
      key: 'type',
      type: 'button',
      label: '菜单类型',
      options: [...TYPE_OPTIONS],
      rules: { required: true, trigger: 'change' },
    },
    { key: 'label', type: 'input', label: labelName, placeholder: `请输入${labelName}`, rules: { required: true } },
  ];

  // 目录/菜单需要路由地址与图标；按钮无路由概念
  if (type !== 'action') {
    fields.push({
      key: 'path',
      type: 'input',
      label: '路由地址',
      placeholder: '如 /system/user',
      rules: { required: true },
    });
  }
  // 按钮必须有权限标识；菜单选填（页面路由本身可作权限）；目录无
  if (type !== 'module') {
    fields.push({
      key: 'id',
      type: 'input',
      label: '权限标识',
      placeholder: '如 action:system:user:create',
      rules: type === 'action' ? { required: true } : undefined,
    });
  }
  if (type !== 'action') {
    fields.push({ key: 'icon', type: 'input', label: '菜单图标', placeholder: 'Element Plus 图标名，如 Goods' });
  }

  fields.push(
    { key: 'sort', type: 'number', label: '排序', defaultValue: 1, props: { min: 0, max: 9999 } },
    {
      key: 'status',
      type: 'radio',
      label: '状态',
      defaultValue: 1,
      options: [
        { label: '启用', value: 1 },
        { label: '禁用', value: 0 },
      ],
    },
  );

  return { formId: 'menu-form', fields };
});

/**
 * FormDialog 内部字段变化回调：类型 radio 切换 → 更新上下文
 * schema 与标题均为 computed，随之自动更新
 */
function handleFieldChange(key: string, value: unknown): void {
  if (key === 'type') {
    dialogMeta.currentType = value as MenuType;
  }
}

/**
 * 打开新增弹窗
 * @param parent 父节点，不传表示新增根节点
 */
function handleCreate(parent?: MenuItem): void {
  dialogMeta.mode = 'create';
  dialogMeta.currentType = parent?.type === 'page' ? 'action' : 'page';
  dialogMeta.parentId = parent?.id ?? '';
  dialogMeta.parentLabel = parent?.label ?? '根目录';
  formDialogRef.value?.open({
    parentLabel: dialogMeta.parentLabel,
    type: dialogMeta.currentType,
    sort: 1,
    status: 1,
  });
}

/** 打开编辑弹窗（回填行数据） */
function handleEdit(row: MenuItem): void {
  dialogMeta.mode = 'edit';
  dialogMeta.currentType = row.type;
  dialogMeta.editingId = row.id;
  dialogMeta.editingLabel = row.label;
  formDialogRef.value?.open({
    parentLabel: '—',
    type: row.type,
    label: row.label,
    path: row.path ?? '',
    id: row.id,
    icon: row.icon ?? '',
    sort: row.sort,
    status: row.status,
  });
}

/**
 * 接收 FormDialog 校验通过后的表单数据，执行本地新增/编辑
 * @param data 表单数据（含 parentLabel 展示字段，此处不消费）
 */
function handleFormSubmit(data: Record<string, any>): void {
  try {
    if (dialogMeta.mode === 'create') {
      const node: MenuItem = {
        // 目录类型无权限标识字段，用时间戳兜底保证 row-key 唯一
        id: data.id || `menu:${Date.now()}`,
        label: data.label,
        type: data.type as MenuType,
        path: data.path || undefined,
        icon: data.icon || undefined,
        sort: data.sort,
        status: data.status as 0 | 1,
        createTime: formatNow(),
      };

      if (dialogMeta.parentId) {
        const parent = findNode(rawMenus.value, dialogMeta.parentId);
        if (parent) {
          parent.children = parent.children ?? [];
          parent.children.push(node);
        }
      } else {
        rawMenus.value.push(node);
      }
      ElMessage.success('新增成功');
    } else {
      const target = findNode(rawMenus.value, dialogMeta.editingId);
      if (target) {
        target.id = data.id || target.id; // 目录类型无权限标识字段，保留原 id
        target.label = data.label;
        target.type = data.type as MenuType;
        target.path = data.path || undefined;
        target.icon = data.icon || undefined;
        target.sort = data.sort;
        target.status = data.status as 0 | 1;
      }
      ElMessage.success('保存成功');
    }

    formDialogRef.value?.close();
    tableKey.value += 1;
  } catch (err) {
    console.error('保存菜单失败:', err);
    ElMessage.error('保存失败');
  }
}

/** 删除菜单节点 */
async function handleDelete(row: MenuItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除「${row.label}」吗？其下子项将一并删除。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      confirmButtonClass: 'el-button--danger',
    });

    // TODO: 替换为真实接口
    // await $fetch(`/api/public/menus/${row.id}`, { method: "DELETE" });

    removeNode(rawMenus.value, row.id);
    tableKey.value += 1;
    ElMessage.success('删除成功');
  } catch {
    // 用户取消，无需处理
  }
}

/* ==================== 生命周期 ==================== */

onMounted(() => {
  fetchMenus();
});
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.menu-admin {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
  padding: 16px;
  background-color: var(--el-bg-color-page);
}

/* ==================== 卡片通用 ==================== */
.filter-card,
.table-card {
  border-color: var(--el-border-color-lighter);
  border-radius: 8px;
}

/* 表格卡片纵向撑满剩余空间 */
.table-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.table-card :deep(.el-card__body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  padding: 16px;
}

/* ==================== 筛选表单 ==================== */
/* 用 flex 接管换行与间距，避免 inline 表单自带 margin 造成的错位 */
.filter-form {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

.filter-form :deep(.el-form-item) {
  flex: none;
  margin: 0;
}

/* ==================== 工具栏 ==================== */
.table-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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
.menu-table {
  flex: 1;
  min-height: 0;
}

/* 单元格内容 */
.perm-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 13px;
  color: var(--el-text-color-regular);
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
