<template>
  <div class="permission-admin">
    <h2 class="page-title">🔐 权限配置管理</h2>
    <p class="page-desc">
      勾选按钮权限时，系统会自动级联勾选其所在页面与模块；取消页面权限时，其下所有按钮权限将同步取消。
      点击「保存到本地」后，配置写入 localStorage 并同步到全局权限状态。
    </p>

    <div class="admin-layout">
      <!-- 左侧：权限树配置 -->
      <aside class="tree-panel">
        <div class="panel-header">
          <h3>📋 权限树配置</h3>
          <el-button size="small" type="primary" @click="saveToLocal">
            保存到本地
          </el-button>
        </div>

        <el-tree
          ref="treeRef"
          :data="_rawTree"
          :props="treeFieldMap"
          node-key="id"
          show-checkbox
          check-strictly
          :default-checked-keys="checkedKeys"
          :default-expand-all="true"
          @check="onPermissionChange"
        />

        <div class="panel-actions">
          <el-button size="small" @click="resetToDefault"> 重置默认 </el-button>
          <el-button size="small" @click="clearAll"> 全部清空 </el-button>
          <el-button size="small" type="info" @click="exportToConsole">
            导出到控制台
          </el-button>
        </div>
      </aside>

      <!-- 右侧：权限试验场 -->
      <main class="preview-panel">
        <h3 class="preview-title">🧪 权限试验场</h3>

        <!-- 导航菜单预览 -->
        <section class="preview-card">
          <div class="card-label">顶部导航预览</div>
          <div class="nav-preview">
            <el-tag
              v-for="menu in pageMenus"
              :key="menu.id"
              :type="hasPageAccess(menu.id) ? 'success' : 'info'"
              :effect="hasPageAccess(menu.id) ? 'dark' : 'plain'"
              class="nav-item"
            >
              {{ menu.label }}
              <span v-if="!hasPageAccess(menu.id)" class="muted"
                >（无权限）</span
              >
            </el-tag>
          </div>
        </section>

        <!-- 页面内容预览 -->
        <section class="preview-card">
          <div class="card-label">页面内容预览</div>
          <el-tabs v-model="activePageId" type="border-card">
            <el-tab-pane
              v-for="page in pageMenus"
              :key="page.id"
              :label="page.label"
              :name="page.id"
            >
              <div class="page-content">
                <p class="page-name">📌 当前页面：{{ page.label }}</p>

                <div class="btn-row">
                  <el-button
                    v-for="btn in getPageButtons(page.id)"
                    :key="btn.id"
                    :type="btn.uiType"
                    :disabled="!hasPermission(btn.id)"
                    @click="simulateAction(btn)"
                  >
                    {{ btn.label }}
                    <span v-if="!hasPermission(btn.id)" class="muted"
                      >（无权限）</span
                    >
                  </el-button>
                </div>

                <el-alert
                  v-if="
                    getPageButtons(page.id).length > 0 &&
                    !hasAnyPageButton(page.id)
                  "
                  type="warning"
                  :closable="false"
                  class="mt-16"
                >
                  当前页面没有任何操作权限，请在左侧勾选「{{
                    page.label
                  }}」下的按钮权限。
                </el-alert>
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>

        <!-- 当前权限状态 -->
        <section class="debug-card">
          <div class="debug-header">
            <span>✅ 当前已勾选权限（{{ checkedKeys.length }} 个）</span>
            <el-button size="small" text @click="copyKeys"> 复制 ID </el-button>
          </div>
          <div class="debug-tags">
            <el-tag
              v-for="key in checkedKeys"
              :key="key"
              size="small"
              :type="getTagType(key)"
              class="debug-tag"
            >
              {{ key }}
            </el-tag>
          </div>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ActionButtonConfig,
  PermissionId,
  PermissionNode,
  PermissionTree,
} from "~~/types/permission";
import { ElTag } from "element-plus";
import { ElMessage } from "element-plus";
import {
  findNodeById,
  collectDescendantIds,
  getParentIds,
  extractPageMenus,
  getPageActions,
  createPermissionChecker,
} from "~~/app/composables/usePermission";

// 提取 ElTag 实例的 $props 类型
type ElTagProps = InstanceType<typeof ElTag>["$props"];
type ElTagType = ElTagProps["type"];
// ============================================================
//  0. 权限树数据（可自由扩展，遵循命名规范）
// ============================================================
// raw 私有：仅本模块可见，外部只拿到 readonly 代理，杜绝运行时篡改
const _rawTree: PermissionNode[] = [
  {
    id: "module:system" as PermissionId,
    label: "系统管理",
    children: [
      {
        id: "page:system:user" as PermissionId,
        label: "用户管理",
        children: [
          {
            id: "action:system:user:create" as PermissionId,
            label: "新增用户",
          },
          { id: "action:system:user:edit" as PermissionId, label: "编辑用户" },
          {
            id: "action:system:user:delete" as PermissionId,
            label: "删除用户",
          },
          {
            id: "action:system:user:export" as PermissionId,
            label: "导出用户",
          },
        ],
      },
      {
        id: "page:system:role" as PermissionId,
        label: "角色管理",
        children: [
          {
            id: "action:system:role:create" as PermissionId,
            label: "新增角色",
          },
          {
            id: "action:system:role:assign" as PermissionId,
            label: "分配权限",
          },
        ],
      },
    ],
  },
  {
    id: "module:content" as PermissionId,
    label: "内容管理",
    children: [
      {
        id: "page:content:article" as PermissionId,
        label: "文章管理",
        children: [
          {
            id: "action:content:article:publish" as PermissionId,
            label: "发布文章",
          },
          {
            id: "action:content:article:audit" as PermissionId,
            label: "审核文章",
          },
          {
            id: "action:content:article:delete" as PermissionId,
            label: "删除文章",
          },
        ],
      },
    ],
  },
];

// 深度只读代理：编译期(readonly 类型) + 运行期(Vue readonly) 双层防御，杜绝篡改
const permissionTree: PermissionTree = readonly(_rawTree);

const treeFieldMap = { children: "children", label: "label" };

// ============================================================
//  1. 默认权限配置
// ============================================================
const defaultCheckedKeys: PermissionId[] = [
  "page:system:user",
  "action:system:user:create",
  "action:system:role:assign",
];

// ============================================================
//  2. 响应式状态
// ============================================================
const treeRef = ref();
const checkedKeys = ref<PermissionId[]>([...defaultCheckedKeys]);
const activePageId = ref<PermissionId>("page:system:user");

// 从 checkedKeys 构建权限判断器（试验场使用本地状态实时反馈）
const checker = computed(() => createPermissionChecker(checkedKeys.value));

// 页面菜单（自动提取）
const pageMenus = computed(() => extractPageMenus(permissionTree));

// 全局权限 store（保存/恢复时同步）
const permissionStore = usePermissionStore();

// ============================================================
//  3. 权限判断方法
// ============================================================
const hasPermission = (id: PermissionId): boolean =>
  checker.value.hasPermission(id);
const hasPageAccess = (id: PermissionId): boolean =>
  checker.value.hasPageAccess(id);

const hasAnyPageButton = (pageId: PermissionId): boolean => {
  const buttons = getPageButtons(pageId);
  return buttons.some((btn) => hasPermission(btn.id));
};

const getPageButtons = (pageId: PermissionId) =>
  getPageActions(permissionTree, pageId);

// ============================================================
//  4. Tree 级联事件处理
// ============================================================
const onPermissionChange = (
  _: PermissionNode,
  checkedInfo: { checkedKeys: PermissionId[] },
): void => {
  if (!treeRef.value) return;

  const newChecked = new Set<PermissionId>(checkedInfo.checkedKeys);
  const previousChecked = new Set<PermissionId>(checkedKeys.value);

  // 级联向下：被取消勾选的节点，取消其所有子孙
  const uncheckedKeys = [...previousChecked].filter((k) => !newChecked.has(k));
  for (const key of uncheckedKeys) {
    const node = findNodeById(permissionTree, key);
    const descendants = collectDescendantIds(node);
    descendants.forEach((did) => newChecked.delete(did));
  }

  // 级联向上：所有被勾选的节点，其所有父节点也必须勾选
  const keysToProcess = [...newChecked];
  for (const key of keysToProcess) {
    const parents = getParentIds(permissionTree, key);
    parents.forEach((pid) => newChecked.add(pid));
  }

  const finalKeys = [...newChecked];
  checkedKeys.value = finalKeys;

  // 同步到 Tree UI
  nextTick(() => {
    treeRef.value?.setCheckedKeys(finalKeys, false);
  });
};

// ============================================================
//  5. 工具方法
// ============================================================
const getTagType = (key: PermissionId): ElTagType => {
  if (key.startsWith("action:")) return "primary";
  if (key.startsWith("page:")) return "success";
  return "warning";
};

const simulateAction = (btn: { id: PermissionId; label: string }): void => {
  if (hasPermission(btn.id)) {
    ElMessage.success(`✅ 执行了「${btn.label}」操作`);
  } else {
    ElMessage.error(`❌ 无权限执行「${btn.label}」`);
  }
};

// ============================================================
//  6. 本地存储操作（与 permission store 共用同一键）
// ============================================================
const LOCAL_KEY = "permission_config";

const saveToLocal = (): void => {
  if (process.client) {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(checkedKeys.value));
    // 同步到全局权限 store，使中间件 / $hasPermission 立即生效
    permissionStore.setPermissions(checkedKeys.value);
    ElMessage.success("权限配置已保存到本地存储并同步生效");
  }
};

const loadFromLocal = (): void => {
  if (process.client) {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as PermissionId[];
        // 校验数据有效性
        const validKeys = parsed.filter(
          (k): k is PermissionId =>
            typeof k === "string" &&
            (k.startsWith("module:") ||
              k.startsWith("page:") ||
              k.startsWith("action:")),
        );
        checkedKeys.value = validKeys;
        nextTick(() => {
          treeRef.value?.setCheckedKeys(validKeys, false);
        });
        // 恢复时同步到 store，保持全局状态与本地配置一致
        permissionStore.setPermissions(validKeys);
        ElMessage.info("已从本地存储恢复权限配置");
        return;
      } catch {
        // 解析失败，使用默认值
      }
    }
  }
  // 无缓存时使用默认值（仅用于试验场展示，不写入 store）
  checkedKeys.value = [...defaultCheckedKeys];
  nextTick(() => {
    treeRef.value?.setCheckedKeys(defaultCheckedKeys, false);
  });
};

const resetToDefault = (): void => {
  checkedKeys.value = [...defaultCheckedKeys];
  nextTick(() => {
    treeRef.value?.setCheckedKeys(defaultCheckedKeys, false);
  });
  ElMessage.info("已重置为默认权限（未保存，请点击「保存到本地」生效）");
};

const clearAll = (): void => {
  checkedKeys.value = [];
  nextTick(() => {
    treeRef.value?.setCheckedKeys([], false);
  });
  ElMessage.info("已清空所有权限（未保存，请点击「保存到本地」生效）");
};

const exportToConsole = (): void => {
  console.table({
    当前勾选权限: checkedKeys.value,
  });
  ElMessage.success("权限列表已输出到控制台（F12 查看）");
};

const copyKeys = async (): Promise<void> => {
  try {
    await navigator.clipboard.writeText(checkedKeys.value.join(", "));
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败");
  }
};

// ============================================================
//  7. 生命周期
// ============================================================
onMounted(() => {
  loadFromLocal();
});
</script>

<style scoped>
.permission-admin {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: var(--kk-font-size-extra-large);
  color: var(--el-text-color-primary);
}

.page-desc {
  margin: 0 0 24px 0;
  font-size: var(--kk-font-size-small);
  color: var(--el-text-color-secondary);
  line-height: var(--kk-line-height-base);
}

.admin-layout {
  display: flex;
  gap: 24px;
  height: calc(100vh - 160px);
}

/* ---------- 左侧树面板 ---------- */
.tree-panel {
  flex: 0 0 380px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.panel-header h3 {
  margin: 0;
  font-size: var(--kk-font-size-medium);
  color: var(--el-text-color-primary);
}

:deep(.el-tree) {
  flex: 1;
  overflow-y: auto;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  padding: 8px;
  background: var(--el-fill-color-blank);
}

.panel-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* ---------- 右侧预览面板 ---------- */
.preview-panel {
  flex: 1;
  background: var(--el-bg-color-page);
  border-radius: 8px;
  padding: 20px;
  overflow-y: auto;
}

.preview-title {
  margin: 0 0 16px 0;
  font-size: var(--kk-font-size-medium);
  color: var(--el-text-color-primary);
}

.preview-card {
  background: var(--el-bg-color-overlay);
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  box-shadow: var(--el-box-shadow-light);
}

.card-label {
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
  font-size: var(--kk-font-size-small);
}

.nav-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.nav-item {
  cursor: default;
  min-width: 80px;
  text-align: center;
}

.muted {
  color: var(--el-text-color-secondary);
  font-size: var(--kk-font-size-extra-small);
  margin-left: 4px;
}

.page-content {
  padding: 4px 0;
}

.page-name {
  margin: 0 0 12px 0;
  color: var(--el-text-color-regular);
  font-size: var(--kk-font-size-small);
}

.btn-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.mt-16 {
  margin-top: 16px;
}

/* ---------- 调试面板 ---------- */
.debug-card {
  background: var(--el-color-primary-light-9);
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid var(--el-color-primary-light-8);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: var(--kk-font-size-small);
  color: var(--el-color-primary);
  margin-bottom: 10px;
}

.debug-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.debug-tag {
  font-family: "Courier New", monospace;
}
</style>
