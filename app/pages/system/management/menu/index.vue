<template>
  <div class="menu-admin">
    <!-- ==================== 筛选 + 菜单表格（BaseTable：配置化搜索与列） ==================== -->
    <BaseTable
      :table-key="tableKey"
      :show-search="{ items: searchConfig }"
      :columns="columns"
      :show-pagination="false"
      :data="tableData"
      row-key="key"
      :tree-props="{ children: 'children' }"
      :default-expand-all="expandAll"
      :row-class-name="tableRowClassName"
      empty-text="暂无菜单数据"
      class="menu-table"
      @search="handleBaseSearch"
      @reset="handleBaseReset"
    >
      <!-- 工具栏：标题 + 总数 + 操作按钮 -->
      <template #toolbar>
        <div class="table-toolbar">
          <div class="toolbar-left">
            <span class="table-title">菜单列表</span>
            <el-tag type="primary" effect="plain" size="small" round>共 {{ totalCount }} 项</el-tag>
          </div>

          <div class="toolbar-right">
            <el-button :icon="Sort" @click="toggleExpandAll">
              {{ expandAll ? '收起全部' : '展开全部' }}
            </el-button>
            <el-button :icon="Refresh" @click="reloadMenus">刷新</el-button>
            <el-button type="primary" :icon="Plus" @click="handleCreate()">新增</el-button>
          </div>
        </div>
      </template>

      <!-- 自定义列：权限标识（等宽字体展示） -->
      <template #perm="{ row }">
        <span class="perm-code">{{ row.perm || '—' }}</span>
      </template>

      <!-- 自定义列：排序 -->
      <template #sort="{ row }">{{ row.sort ?? '—' }}</template>

      <!-- 自定义列：状态（圆点指示） -->
      <template #status="{ row }">
        <span class="status-cell">
          <i class="status-dot" :class="row.status === 1 ? 'is-on' : 'is-off'" />
          {{ row.status === 1 ? '启用' : '隐藏' }}
        </span>
      </template>

      <!-- 自定义列：操作 -->
      <template #actions="{ row }">
        <div class="flex flex-row">
          <el-button
            v-if="row.type !== 'action'"
            link
            type="success"
            :icon="Plus"
            @click="handleCreate(row as MenuItem)"
          >
            新增子项
          </el-button>

          <el-button link type="primary" :icon="Edit" @click="handleEdit(row as MenuItem)">编辑</el-button>

          <el-button link type="danger" :icon="Delete" @click="handleDelete(row as MenuItem)">删除</el-button>
        </div>
      </template>
    </BaseTable>

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
import { Delete, Edit, Plus, Refresh, Sort } from '@element-plus/icons-vue';
import type { FormSchema, FieldConfig, FieldOption } from '~~/types/dynamicForm';
import type { PermissionResource } from '~~/types/permission';
import type { SearchFormItem } from '@/components/BaseTable.vue';
import FormDialog from '@/components/FormDialog.vue';
import BaseTable from '@/components/BaseTable.vue';

/* ==================== 类型定义 ==================== */

type MenuType = 'module' | 'page' | 'action';

/** 菜单节点（由 permissions 全量目录树派生，携带 dbId/parentId 供 CRUD 定位） */
interface MenuItem {
  /** 唯一标识（row-key）：`n:{dbId}` */
  key: string;
  /** permissions 表主键（CRUD 定位） */
  dbId: number;
  /** 父节点 permissions id（0=根；按钮归属由 path 表达，恒 0） */
  parentId: number;
  /** 权限标识（page:/xxx、action:/xxx:code、dir:/xxx） */
  perm: string;
  /** 显示名称 */
  label: string;
  /** 节点类型：目录 / 菜单 / 按钮 */
  type: MenuType;
  /** 路由地址（目录 / 菜单；按钮=所属页面） */
  path?: string;
  /** 菜单图标（目录 / 菜单） */
  icon?: string;
  /** 排序值 */
  sort: number | null;
  /** 状态：1 显示，0 隐藏（对应 menu_visible） */
  status: 0 | 1;
  /** 创建时间 */
  createTime: string;
  /** 子节点 */
  children?: MenuItem[];
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

/** 顶部筛选配置（BaseTable showSearch：名称关键字 / 类型 / 状态） */
const searchConfig: SearchFormItem[] = [
  {
    label: '菜单名称',
    prop: 'keyword',
    type: 'input',
    placeholder: '菜单名称 / 权限标识',
    attrs: { style: 'width: 220px' },
  },
  {
    label: '类型',
    prop: 'type',
    type: 'select',
    placeholder: '全部',
    options: [...TYPE_OPTIONS],
    attrs: { style: 'width: 140px' },
  },
  {
    label: '状态',
    prop: 'status',
    type: 'select',
    placeholder: '全部',
    options: [
      { label: '启用', value: 1 },
      { label: '隐藏', value: 0 },
    ],
    attrs: { style: 'width: 140px' },
  },
];

/** 表格列配置（自定义单元格经 slotName 注入，列属性直接透传 el-table-column） */
const columns = [
  { prop: 'label', label: '菜单名称', minWidth: 200, showOverflowTooltip: true },
  { prop: 'path', label: '菜单路由', minWidth: 200, showOverflowTooltip: true },
  { prop: 'perm', label: '权限标识', minWidth: 240, showOverflowTooltip: true, slotName: 'perm' },
  { prop: 'sort', label: '排序', width: 80, align: 'center', slotName: 'sort' },
  { prop: 'status', label: '状态', width: 100, align: 'center', slotName: 'status' },
  { prop: 'createTime', label: '创建时间', width: 180, align: 'center' },
  { prop: 'actions', label: '操作', width: 230, fixed: 'right', align: 'center', slotName: 'actions' },
];

/** 按钮操作类型下拉项（code → 中文名，与权限 code 约束保持一致） */
const ACTION_LABELS: Record<string, string> = {
  create: '新增',
  edit: '编辑',
  delete: '删除',
  view: '查看',
  export: '导出',
  import: '导入',
  audit: '审核',
  publish: '发布',
  assign: '分配',
  enable: '启用',
  disable: '禁用',
};

const ACTION_CODE_OPTIONS: FieldOption[] = Object.entries(ACTION_LABELS).map(([value, label]) => ({
  label,
  value,
}));

/**
 * 规范化菜单路径：确保以 / 开头、合并连续斜杠并去除尾部斜杠
 * （菜单路由地址与权限标识 page:/xxx 共用同一口径）
 */
function normalizeMenuPath(path: string): string {
  return `/${path}`.replace(/\/+/g, '/').replace(/\/+$/, '');
}

/** ISO 时间串 → "YYYY-MM-DD HH:mm:ss" */
function formatDateTime(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/* ==================== 筛选状态 ==================== */

/** 已生效的筛选条件（BaseTable 查询/重置回调后同步；编辑态由 BaseTable 表单自持） */
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

/** 原始树数据（由 permissions 全量目录派生） */
const rawMenus = ref<MenuItem[]>([]);
/** 是否默认展开全部 */
const expandAll = ref(true);
/** 用于强制重渲染表格，切换展开态 / 重新筛选时刷新 */
const tableKey = ref(0);
/** 提交进行中（防重复点击） */
const submitting = ref(false);

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
      (!keyword || node.label.includes(keyword) || node.perm.includes(keyword)) &&
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

/**
 * 行高亮：页面级黄色（warning）、按钮级绿色（success），目录不着色
 * @param row 行数据（MenuItem）
 */
function tableRowClassName({ row }: { row: MenuItem }): string {
  if (row.type === 'page') return 'warning-row';
  if (row.type === 'action') return 'success-row';
  return '';
}

/** 递归查找节点（按 row-key） */
function findNode(list: MenuItem[], key: string): MenuItem | null {
  for (const node of list) {
    if (node.key === key) return node;
    if (node.children) {
      const hit = findNode(node.children, key);
      if (hit) return hit;
    }
  }
  return null;
}

/** 递归查找节点（按 permissions 主键 dbId） */
function findNodeById(list: MenuItem[], dbId: number): MenuItem | null {
  for (const node of list) {
    if (node.dbId === dbId) return node;
    if (node.children) {
      const hit = findNodeById(node.children, dbId);
      if (hit) return hit;
    }
  }
  return null;
}

/** 按 path 查找页面节点（按钮归属由 path 表达） */
function findPageByPath(list: MenuItem[], path: string): MenuItem | null {
  for (const node of list) {
    if (node.type === 'page' && node.path === path) return node;
    if (node.children) {
      const hit = findPageByPath(node.children, path);
      if (hit) return hit;
    }
  }
  return null;
}

/* ==================== 数据构建（来源：permissions 全量目录，SSR 启动缓存） ==================== */

/**
 * PermissionResource（后端三级树）→ MenuItem（表格节点）
 * type：0 目录 / 1 页面 / 2 按钮
 * 状态列语义：目录/页面看 menu_visible（侧边栏显隐），按钮看 status（启用/禁用）
 */
function resToMenu(node: PermissionResource): MenuItem {
  const type: MenuType = node.type === 0 ? 'module' : node.type === 1 ? 'page' : 'action';
  return {
    key: `n:${node.id}`,
    dbId: node.id,
    parentId: node.parentId ?? 0,
    perm: node.permKey,
    label: node.label,
    type,
    path: node.path,
    icon: node.icon ?? undefined,
    sort: node.sortOrder,
    status: (type === 'action' ? node.status === 1 : node.menuVisible) ? 1 : 0,
    createTime: formatDateTime(node.createdAt),
    children: node.children?.length ? node.children.map(resToMenu) : undefined,
  };
}

/** 从启动缓存（permissionStore.allPermissions）构建菜单树 */
function buildMenuTree(): MenuItem[] {
  const permissionStore = usePermissionStore();
  return permissionStore.allPermissions.map(resToMenu);
}

/** 重新拉取全量目录并重建表格（刷新按钮 / CRUD 成功后调用） */
async function reloadMenus(): Promise<void> {
  const permissionStore = usePermissionStore();
  await permissionStore.fetchAllPermissions();
  rawMenus.value = buildMenuTree();
  tableKey.value += 1;
}

/* ==================== 筛选交互 ==================== */

/** BaseTable 查询回调：同步生效筛选条件（空值字段回退为不过滤；status=0 隐藏需保留） */
function handleBaseSearch(form: Record<string, any>): void {
  applied.value = {
    keyword: String(form.keyword ?? ''),
    type: (form.type ?? '') as MenuType | '',
    status: (form.status ?? '') as number | '',
  };
  tableKey.value += 1;
}

/** BaseTable 重置回调：清空生效筛选条件 */
function handleBaseReset(): void {
  applied.value = { keyword: '', type: '', status: '' };
  tableKey.value += 1;
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
  /** 新增时生效的上级节点类型（'' 表示根级）：初始取入口节点，随表单「上级菜单」切换更新，驱动类型可选项 */
  createParentType: '' as '' | MenuType,
  /** 编辑时的目标节点 dbId（用于 PUT/定位；表单 id 可能被改动） */
  editingId: 0,
  editingLabel: '',
});

/** 弹窗标题：编辑固定为节点名；新增随类型 radio 联动（上级由表单内下拉选择） */
const dialogTitle = computed(() => {
  if (dialogMeta.mode === 'edit') return `编辑 - ${dialogMeta.editingLabel}`;
  return `新增${TYPE_TEXT[dialogMeta.currentType]}`;
});

/** 根目录选项值（上级菜单下拉中代表顶级节点，非真实节点 dbId） */
const ROOT_PARENT_KEY = '/';

/**
 * 按菜单类型收集可选的上级菜单选项（value 为节点 dbId）
 * - 目录/菜单 → 根目录（/） + 全部目录（页面不能作为上级）
 * - 按钮 → 全部页面（必须挂在页面下，无根目录选项）
 */
function collectParentOptions(type: MenuType): FieldOption[] {
  const options: FieldOption[] = [];
  if (type !== 'action') options.push({ label: ROOT_PARENT_KEY, value: ROOT_PARENT_KEY });
  const wanted: MenuType = type === 'action' ? 'page' : 'module';
  const walk = (list: MenuItem[]): void => {
    for (const node of list) {
      if (node.type === wanted) {
        options.push({
          label: node.path ? `${node.label}（${node.path}）` : node.label,
          value: String(node.dbId),
        });
      }
      if (node.children?.length) walk(node.children);
    }
  };
  walk(rawMenus.value);
  return options;
}

/** 弹窗表单配置：随「菜单类型」radio 联动
 * - 上级菜单：编辑时禁用回显；新增时下拉选择（选项随类型过滤，按钮只能挂页面下）
 * - 目录：名称 + 路由地址 + 图标
 * - 菜单：名称 + 路由地址 + 图标（权限标识 page:{路由地址} 自动生成，只读展示）
 * - 按钮：名称 + 操作类型（权限标识 action:{上级页面path}:{操作类型} 自动生成，只读展示）
 * 编辑态：路由地址 / 操作类型是权限身份键（改则破坏 role_permissions 外键），禁用不可改
 */
const formSchema = computed<FormSchema>(() => {
  const type = dialogMeta.currentType;
  const isEdit = dialogMeta.mode === 'edit';
  const labelName = { module: '目录名称', page: '菜单名称', action: '按钮名称' }[type];
  const fields: FieldConfig[] = [];

  // 上级菜单：编辑禁用回显；新增按类型下拉（按钮必选页面，其余可选根目录/目录）
  if (isEdit) {
    fields.push({ key: 'parentLabel', type: 'input', label: '上级菜单', props: { disabled: true } });
  } else {
    fields.push({
      key: 'parentId',
      type: 'select',
      label: '上级菜单',
      options: collectParentOptions(type),
      placeholder: '请选择上级菜单',
      rules: type === 'action' ? { required: true, trigger: 'change' } : undefined,
    });
  }

  // 菜单类型可选项随上级节点类型联动（createParentType 由表单「上级菜单」实时驱动）：
  // 页面下只能加按钮；根/目录下只有目录与页面（按钮必须挂页面）；编辑时不限定
  const typeOptions = isEdit
    ? [...TYPE_OPTIONS]
    : TYPE_OPTIONS.filter((opt) =>
        dialogMeta.createParentType === 'page' ? opt.value === 'action' : opt.value !== 'action',
      );

  fields.push(
    {
      key: 'type',
      type: 'button',
      label: '菜单类型',
      options: typeOptions,
      rules: { required: true, trigger: 'change' },
    },
    { key: 'label', type: 'input', label: labelName, placeholder: `请输入${labelName}`, rules: { required: true } },
  );

  // 目录/菜单需要路由地址与图标；按钮无路由概念（编辑态路由地址为身份键，禁用）
  if (type !== 'action') {
    fields.push({
      key: 'path',
      type: 'input',
      label: '路由地址',
      placeholder: '如 /system/user',
      rules: { required: true },
      props: isEdit ? { disabled: true } : undefined,
    });
  }
  // 按钮需选择操作类型（进 perm_key 末段；编辑态为身份键，禁用）
  if (type === 'action') {
    fields.push({
      key: 'code',
      type: 'select',
      label: '操作类型',
      options: [...ACTION_CODE_OPTIONS],
      placeholder: '请选择操作类型',
      rules: { required: true, trigger: 'change' },
      props: isEdit ? { disabled: true } : undefined,
    });
  }
  // 权限标识自动生成（只读）：菜单 page:{路由地址}；按钮 action:{上级页面path}:{操作类型}
  if (type !== 'module') {
    fields.push({
      key: 'id',
      type: 'input',
      label: '权限标识',
      props: { disabled: true },
      placeholder: type === 'page' ? '由路由地址自动生成' : '由上级页面与操作类型自动生成',
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
        { label: '隐藏', value: 0 },
      ],
    },
  );

  return { formId: 'menu-form', fields };
});

/** 弹窗内实时表单值缓存（由 fieldChange 事件维护，用于联动生成权限标识展示值） */
const liveForm = reactive({ parentId: '', path: '', code: '' });

/**
 * 解析按钮归属页面的路由地址
 * 新增取表单所选上级页面（parentId 为 dbId）；编辑取原按钮节点 path（按钮行 path = 所属页面 path）
 */
function resolveActionPagePath(): string {
  if (dialogMeta.mode === 'edit') {
    return findNodeById(rawMenus.value, dialogMeta.editingId)?.path ?? '';
  }
  const parentDbId = liveForm.parentId && liveForm.parentId !== ROOT_PARENT_KEY ? Number(liveForm.parentId) : 0;
  return parentDbId ? (findNodeById(rawMenus.value, parentDbId)?.path ?? '') : '';
}

/** 按当前类型与已填字段联动刷新权限标识（只读展示值） */
function syncPermDisplay(): void {
  if (dialogMeta.currentType === 'page') {
    const path = liveForm.path ? normalizeMenuPath(liveForm.path) : '';
    formDialogRef.value?.setValue('id', path ? `page:${path}` : '');
  } else if (dialogMeta.currentType === 'action') {
    const pagePath = resolveActionPagePath();
    formDialogRef.value?.setValue(
      'id',
      pagePath && liveForm.code ? `action:${normalizeMenuPath(pagePath)}:${liveForm.code}` : '',
    );
  }
}

/**
 * 新增模式下随表单「上级菜单」联动菜单类型：
 * 上级为页面 → 仅按钮；上级为根/目录 → 目录/页面。
 * 仅在当前类型因切换失效时纠正（同层切换不动用户已选类型）
 */
function syncTypeByParent(): void {
  const parentDbId = liveForm.parentId && liveForm.parentId !== ROOT_PARENT_KEY ? Number(liveForm.parentId) : 0;
  const parent = parentDbId ? findNodeById(rawMenus.value, parentDbId) : null;
  dialogMeta.createParentType = parent?.type ?? '';
  const parentIsPage = parent?.type === 'page';
  if (parentIsPage && dialogMeta.currentType !== 'action') {
    dialogMeta.currentType = 'action';
    formDialogRef.value?.setValue('type', 'action');
  } else if (!parentIsPage && dialogMeta.currentType === 'action') {
    dialogMeta.currentType = 'page';
    liveForm.code = '';
    formDialogRef.value?.setValue('type', 'page');
  }
}

/**
 * FormDialog 内部字段变化回调：
 * - type 切换 → 更新上下文（schema/标题联动），并重置随字段增删失效的缓存值
 * - parentId 变化 → 新增时联动菜单类型可选项，并刷新权限标识展示值
 * - path/code 变化 → 联动刷新权限标识展示值
 */
function handleFieldChange(key: string, value: unknown): void {
  if (key === 'type') {
    const wasAction = dialogMeta.currentType === 'action';
    dialogMeta.currentType = value as MenuType;
    // path 字段在按钮 schema 中不存在，切回时由 FormDialog watch 重建为空；code 仅按钮存在
    if (wasAction || dialogMeta.currentType === 'action') liveForm.path = '';
    liveForm.code = '';
  } else if (key === 'parentId' || key === 'path' || key === 'code') {
    liveForm[key as keyof typeof liveForm] = String(value ?? '');
    if (key === 'parentId' && dialogMeta.mode === 'create') syncTypeByParent();
  }
  syncPermDisplay();
}

/**
 * 打开新增弹窗
 * @param parent 父节点，不传表示新增根节点（上级仍可在表单下拉中改选）
 */
function handleCreate(parent?: MenuItem): void {
  dialogMeta.mode = 'create';
  dialogMeta.createParentType = parent?.type ?? '';
  dialogMeta.currentType = parent?.type === 'page' ? 'action' : 'page';
  // 工具栏「新增」默认上级为根目录（/），行内「新增子项」预选所在节点（dbId）
  liveForm.parentId = parent ? String(parent.dbId) : ROOT_PARENT_KEY;
  liveForm.path = '';
  liveForm.code = '';
  formDialogRef.value?.open({
    parentId: liveForm.parentId,
    type: dialogMeta.currentType,
    sort: 1,
    status: 1,
  });
}

/** 打开编辑弹窗（回填行数据；按钮从 perm 末段解析操作类型；上级回显名称） */
function handleEdit(row: MenuItem): void {
  dialogMeta.mode = 'edit';
  dialogMeta.currentType = row.type;
  dialogMeta.editingId = row.dbId;
  dialogMeta.editingLabel = row.label;
  liveForm.parentId = '';
  liveForm.path = row.path ?? '';
  liveForm.code = /^action:.+:([^:]+)$/.exec(row.perm ?? '')?.[1] ?? '';
  // 上级回显：按钮归属由 path 指向的页面表达（parent_id=0）；目录/菜单按 parent_id 定位
  const parent =
    row.type === 'action'
      ? findPageByPath(rawMenus.value, row.path ?? '')
      : row.parentId
        ? findNodeById(rawMenus.value, row.parentId)
        : null;
  formDialogRef.value?.open({
    parentLabel: parent ? `${parent.label}（${parent.path}）` : '根目录',
    type: row.type,
    label: row.label,
    path: row.path ?? '',
    code: liveForm.code,
    id: row.perm,
    icon: row.icon ?? '',
    sort: row.sort ?? 1,
    status: row.status,
  });
}

/** 表单值 → 后端权限类型编号（0 目录 / 1 页面 / 2 按钮） */
function toBackendType(type: MenuType): number {
  return type === 'module' ? 0 : type === 'page' ? 1 : 2;
}

/**
 * 接收 FormDialog 校验通过后的表单数据，调用真实接口执行新增/编辑
 * @param data 表单数据（create 含 parentId 上级 dbId；edit 含 parentLabel 回显字段，此处不消费）
 */
async function handleFormSubmit(data: Record<string, any>): Promise<void> {
  if (submitting.value) return;
  const requestFetch = useRequestFetch();
  const type = data.type as MenuType;

  // ---------- 组装上级（新增）：parentId 为节点 dbId，'/' 或空 → 根（0） ----------
  const parentKey = String(data.parentId ?? '');
  const parentDbId = parentKey && parentKey !== ROOT_PARENT_KEY ? Number(parentKey) : 0;
  const parent = parentDbId ? findNodeById(rawMenus.value, parentDbId) : null;

  if (dialogMeta.mode === 'create') {
    // 上级合法性校验：目录/菜单 → 根目录(/)或目录；按钮 → 必须挂在页面下
    if (parentKey && parentKey !== ROOT_PARENT_KEY && !parent) {
      ElMessage.error('上级菜单不存在，请重新选择');
      return;
    }
    if (type === 'action') {
      if (!parent || parent.type !== 'page') {
        ElMessage.error('按钮必须挂在页面（菜单）下');
        return;
      }
    } else if (parent && parent.type !== 'module') {
      ElMessage.error('目录/菜单的上级只能是根目录或其他目录');
      return;
    }
  }

  const sortOrder = Number.isInteger(Number(data.sort)) ? Number(data.sort) : 0;
  const statusValue = Number(data.status) === 0 ? 0 : 1;
  const iconValue = String(data.icon ?? '').trim() || undefined;

  submitting.value = true;
  try {
    if (dialogMeta.mode === 'create') {
      const body: Record<string, any> = {
        type: toBackendType(type),
        label: String(data.label ?? '').trim(),
        icon: iconValue,
        sortOrder,
      };
      if (type === 'action') {
        // 按钮：path = 所属页面 path，code = 操作类型（perm_key = action:{path}:{code}）；状态列映射 status
        body.path = normalizeMenuPath(parent?.path ?? '');
        body.code = String(data.code ?? '').trim();
        body.status = statusValue;
      } else {
        // 目录/菜单：path = 自身路由地址，parent_id = 上级目录 dbId（0=根）；状态列映射 menu_visible
        body.path = normalizeMenuPath(String(data.path ?? ''));
        body.parentId = parentDbId;
        body.menuVisible = statusValue === 1;
      }
      const res = await requestFetch<{ code: number; message?: string }>('/api/admin/permissions', {
        method: 'POST',
        body,
      });
      if (res.code !== 200) {
        ElMessage.error(res.message || '新增失败');
        return;
      }
      ElMessage.success('新增成功');
    } else {
      // 编辑：type/path/code 为身份键不可改，仅提交名称/图标/排序/状态（按钮样式保留原值）
      const body: Record<string, any> = {
        label: String(data.label ?? '').trim(),
        icon: iconValue,
        sortOrder,
      };
      if (type === 'action') body.status = statusValue;
      else body.menuVisible = statusValue === 1;
      const res = await requestFetch<{ code: number; message?: string }>(
        `/api/admin/permissions/${dialogMeta.editingId}`,
        { method: 'PUT', body },
      );
      if (res.code !== 200) {
        ElMessage.error(res.message || '保存失败');
        return;
      }
      ElMessage.success('保存成功');
    }

    formDialogRef.value?.close();
    await reloadMenus();
  } catch (err: any) {
    console.error('保存菜单失败:', err);
    ElMessage.error(err?.data?.message || '保存失败');
  } finally {
    submitting.value = false;
  }
}

/** 删除菜单节点（调用真实接口，后端级联删除子树） */
async function handleDelete(row: MenuItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确认删除「${row.label}」吗？其下子项将一并删除。`, '删除确认', {
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
    const res = await requestFetch<{ code: number; message?: string }>(`/api/admin/permissions/${row.dbId}`, {
      method: 'DELETE',
    });
    if (res.code !== 200) {
      ElMessage.error(res.message || '删除失败');
      return;
    }
    ElMessage.success(res.message || '删除成功');
    await reloadMenus();
  } catch (err: any) {
    console.error('删除菜单失败:', err);
    ElMessage.error(err?.data?.message || '删除失败');
  }
}

/* ==================== 生命周期 ==================== */

onMounted(() => {
  reloadMenus();
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

/* ==================== BaseTable 高度链 ==================== */
/* 表格纵向撑满剩余空间：wrapper / base-table 两层 flex 链（BaseTable 内部元素，需 :deep） */
.menu-admin :deep(.base-table-wrapper),
.menu-admin :deep(.base-table) {
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
.menu-admin :deep(.menu-table) {
  flex: 1;
  min-height: 0;
}

/* 行高亮：页面级黄、按钮级绿（class 经 $attrs 落在 el-table 上，需 :deep） */
.menu-admin :deep(.menu-table .warning-row) {
  --el-table-tr-bg-color: var(--el-color-warning-light-9);
}
.menu-admin :deep(.menu-table .success-row) {
  --el-table-tr-bg-color: var(--el-color-success-light-9);
}

/* 单元格内容（插槽内容自带页面 scope，无需 :deep） */
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
