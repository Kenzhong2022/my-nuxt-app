<template>
  <div class="permission-sandbox">
    <!-- ===== 左侧：权限配置面板 ===== -->
    <aside class="permission-panel">
      <h3 class="panel-title">📋 权限配置</h3>
      <p class="panel-desc">
        勾选按钮权限时，系统会自动级联勾选其所在页面与模块；取消页面权限时，其下所有按钮权限将同步取消。
      </p>

      <el-tree
        ref="treeRef"
        :data="permissionTree"
        :props="treeFieldMap"
        node-key="id"
        show-checkbox
        check-strictly
        :default-checked-keys="defaultCheckedKeys"
        :default-expand-all="true"
        @check="onPermissionChange"
      />

      <div class="panel-actions">
        <el-button size="small" @click="resetToDefault">
          重置默认权限
        </el-button>
        <el-button size="small" type="primary" @click="exportPermissions">
          导出权限列表
        </el-button>
      </div>
    </aside>

    <!-- ===== 右侧：权限试验场 ===== -->
    <main class="preview-area">
      <h3 class="preview-title">🧪 权限试验场</h3>

      <!-- 页面导航（页面级权限可视化） -->
      <section class="preview-section">
        <div class="section-label">顶部导航</div>
        <div class="nav-bar">
          <el-tag
            v-for="menu in pageNavMenus"
            :key="menu.id"
            :type="hasPageAccess(menu.id) ? 'success' : 'info'"
            :effect="hasPageAccess(menu.id) ? 'dark' : 'plain'"
            class="nav-tag"
          >
            {{ menu.label }}
            <span v-if="!hasPageAccess(menu.id)" class="no-perm-hint"
              >（无权限）</span
            >
          </el-tag>
        </div>
      </section>

      <!-- 页面内容区 Tab 切换 -->
      <section class="preview-section">
        <div class="section-label">页面内容</div>
        <el-tabs v-model="activePageId" type="border-card">
          <el-tab-pane
            v-for="page in pageNavMenus"
            :key="page.id"
            :label="page.label"
            :name="page.id"
          >
            <div class="page-preview">
              <p class="page-current">📌 当前页面：{{ page.label }}</p>

              <!-- 功能按钮（按钮级权限可视化） -->
              <div class="button-group">
                <el-button
                  v-for="btn in getPageButtons(page.id)"
                  :key="btn.id"
                  :type="btn.uiType"
                  :disabled="!hasPermission(btn.id)"
                  @click="handleAction(btn)"
                >
                  {{ btn.label }}
                  <span v-if="!hasPermission(btn.id)" class="no-perm-hint"
                    >（无权限）</span
                  >
                </el-button>
              </div>

              <!-- 无权限提示（动态计算） -->
              <el-alert
                v-if="
                  getPageButtons(page.id).length > 0 &&
                  !hasAnyPageButton(page.id)
                "
                type="warning"
                :closable="false"
                class="empty-perm-alert"
              >
                当前页面没有任何操作权限，请在左侧勾选「{{
                  page.label
                }}」下的按钮权限。
              </el-alert>

              <el-alert
                v-if="getPageButtons(page.id).length === 0"
                type="info"
                :closable="false"
                class="empty-perm-alert"
              >
                当前页面暂无配置操作按钮。
              </el-alert>
            </div>
          </el-tab-pane>
        </el-tabs>
      </section>

      <!-- 调试面板：当前权限状态 -->
      <section class="debug-panel">
        <div class="debug-header">
          <span>✅ 当前已勾选权限 ID（{{ checkedKeys.length }} 个）</span>
          <el-button size="small" text @click="copyToClipboard">
            复制到剪贴板
          </el-button>
        </div>
        <div class="debug-tags">
          <el-tag
            v-for="key in checkedKeys"
            :key="key"
            size="small"
            :type="
              key.startsWith('action:')
                ? ''
                : key.startsWith('page:')
                  ? 'success'
                  : 'warning'
            "
            class="debug-tag"
          >
            {{ key }}
          </el-tag>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from "vue";
import { ElMessage } from "element-plus";

// ============================================================
//  0. 命名规范指南（扩展/替换数据时请遵循）
// ============================================================
/**
 * 【权限 ID 命名规范】
 *
 * 格式：{层级}:{模块}:{页面}:{操作}
 * 示例：
 *   - 模块级：module:system          → 系统管理模块
 *   - 页面级：page:system:user         → 用户管理页面
 *   - 按钮级：action:system:user:create → 新增用户按钮
 *
 * 规则：
 *   1. 全部小写，使用英文半角冒号 `:` 分隔
 *   2. 层级标识固定为：module / page / action
 *   3. 模块名、页面名、操作名使用英文简写或全拼，保持语义
 *   4. 同一页面下的操作避免重复，建议动词开头：create / edit / delete / view / export / audit
 *   5. 若新增模块，按此规范追加即可，无需修改任何业务逻辑
 *
 * 【级联规则】
 *   - 勾选 action 时，自动级联勾选其 page 与 module
 *   - 取消 page 时，自动级联取消其下所有 action
 *   - 权限判断时，action 必须同时满足：自身被勾选 + 所属 page 被勾选
 */

// ============================================================
//  1. 权限树数据（可自由扩展，遵循上述命名规范）
// ============================================================
const permissionTree = [
  {
    id: "module:system",
    label: "系统管理",
    children: [
      {
        id: "page:system:user",
        label: "用户管理",
        children: [
          { id: "action:system:user:create", label: "新增用户" },
          { id: "action:system:user:edit", label: "编辑用户" },
          { id: "action:system:user:delete", label: "删除用户" },
          { id: "action:system:user:export", label: "导出用户" },
        ],
      },
      {
        id: "page:system:role",
        label: "角色管理",
        children: [
          { id: "action:system:role:create", label: "新增角色" },
          { id: "action:system:role:assign", label: "分配权限" },
        ],
      },
    ],
  },
  {
    id: "module:content",
    label: "内容管理",
    children: [
      {
        id: "page:content:article",
        label: "文章管理",
        children: [
          { id: "action:content:article:publish", label: "发布文章" },
          { id: "action:content:article:audit", label: "审核文章" },
          { id: "action:content:article:delete", label: "删除文章" },
        ],
      },
    ],
  },
];

// ============================================================
//  2. 字段映射
// ============================================================
const treeFieldMap = {
  children: "children",
  label: "label",
};

// ============================================================
//  3. 默认权限（初始勾选）
// ============================================================
const defaultCheckedKeys = [
  "page:system:user", // 拥有"用户管理"页面权限
  "action:system:user:create", // 只有新增用户按钮权限
  "action:system:role:assign", // 分配权限按钮权限
];

// ============================================================
//  4. Tree 实例与响应式数据
// ============================================================
const treeRef = ref();
const checkedKeys = ref([...defaultCheckedKeys]);
const activePageId = ref("page:system:user");

// 扁平化权限集合（O(1) 查找）
const permissionSet = computed(() => new Set(checkedKeys.value));

// ============================================================
//  5. 工具函数：树节点操作
// ============================================================

/**
 * 在树中递归查找指定 ID 的节点
 */
const findNodeById = (nodes, targetId) => {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    if (node.children) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 收集某个节点下所有子孙节点的 ID（深度优先，不包含自身）
 */
const collectDescendantIds = (node, result = []) => {
  if (!node || !node.children) return result;
  for (const child of node.children) {
    result.push(child.id);
    collectDescendantIds(child, result);
  }
  return result;
};

/**
 * 获取某个节点的所有父节点 ID（从直接父节点到根节点）
 */
const getParentIds = (targetId) => {
  const parents = [];
  const findPath = (nodes, target, path = []) => {
    for (const node of nodes) {
      if (node.id === target) {
        parents.push(...path);
        return true;
      }
      if (node.children) {
        const found = findPath(node.children, target, [...path, node.id]);
        if (found) return true;
      }
    }
    return false;
  };
  findPath(permissionTree, targetId);
  return parents;
};

/**
 * 获取某个 action 节点所属 page 节点的 ID
 */
const getParentPageId = (actionId) => {
  const findPage = (nodes, target, currentPageId = null) => {
    for (const node of nodes) {
      if (node.id === target) return currentPageId;
      const nextPageId = node.id.startsWith("page:") ? node.id : currentPageId;
      if (node.children) {
        const found = findPage(node.children, target, nextPageId);
        if (found) return found;
      }
    }
    return null;
  };
  return findPage(permissionTree, actionId);
};

/**
 * 构建页面导航菜单（自动从 permissionTree 提取所有 page 级节点）
 */
const pageNavMenus = computed(() => {
  const menus = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      if (node.id.startsWith("page:")) {
        menus.push({ id: node.id, label: node.label });
      }
      if (node.children) walk(node.children);
    }
  };
  walk(permissionTree);
  return menus;
});

/**
 * 获取指定页面下的所有按钮级权限
 */
const getPageButtons = (pageId) => {
  const pageNode = findNodeById(permissionTree, pageId);
  if (!pageNode || !pageNode.children) return [];
  return pageNode.children.map((child) => ({
    id: child.id,
    label: child.label,
    uiType: getElBtnType(child.id),
  }));
};

/**
 * 根据按钮 ID 推断 Element Plus 按钮类型
 */
const getElBtnType = (actionId) => {
  if (actionId.includes(":delete")) return "danger";
  if (actionId.includes(":edit")) return "warning";
  if (actionId.includes(":create") || actionId.includes(":publish"))
    return "primary";
  if (actionId.includes(":export")) return "success";
  return "default";
};

// ============================================================
//  6. 核心权限判断逻辑（含页面前置校验）
// ============================================================

/**
 * 判断单个权限是否存在
 * - action 级：自身被勾选 且 所属 page 被勾选
 * - page/module 级：自身被勾选
 */
const hasPermission = (id) => {
  if (!permissionSet.value.has(id)) return false;

  // action 级权限必须校验其所在页面是否被勾选
  if (id.startsWith("action:")) {
    const pageId = getParentPageId(id);
    if (pageId && !permissionSet.value.has(pageId)) return false;
  }

  return true;
};

/**
 * 判断页面是否有访问权限
 */
const hasPageAccess = (pageId) => {
  return hasPermission(pageId);
};

/**
 * 判断某页面下是否至少有一个按钮权限
 */
const hasAnyPageButton = (pageId) => {
  const buttons = getPageButtons(pageId);
  return buttons.some((btn) => hasPermission(btn.id));
};

// ============================================================
//  7. 事件处理
// ============================================================

/**
 * Tree 勾选事件（核心级联逻辑）
 * - 勾选子节点 → 自动补全所有父节点
 * - 取消父节点 → 自动取消所有子孙节点
 */
const onPermissionChange = (data, checkedInfo) => {
  if (!treeRef.value) return;

  const newChecked = new Set(checkedInfo.checkedKeys);
  const previousChecked = new Set(checkedKeys.value);

  // 1. 级联向下：找出被取消勾选的节点，取消其所有子孙
  const uncheckedKeys = [...previousChecked].filter((k) => !newChecked.has(k));
  for (const key of uncheckedKeys) {
    const node = findNodeById(permissionTree, key);
    const descendants = collectDescendantIds(node);
    descendants.forEach((did) => newChecked.delete(did));
  }

  // 2. 级联向上：所有被勾选的节点，其所有父节点也必须勾选
  const keysToProcess = [...newChecked];
  for (const key of keysToProcess) {
    const parents = getParentIds(key);
    parents.forEach((pid) => newChecked.add(pid));
  }

  const finalKeys = [...newChecked];
  checkedKeys.value = finalKeys;

  // 同步到 Tree UI（setCheckedKeys 不会触发 check 事件，避免递归）
  nextTick(() => {
    treeRef.value?.setCheckedKeys(finalKeys, false);
  });
};

const handleAction = (btn) => {
  ElMessage.success(`✅ 执行了「${btn.label}」操作`);
};

const resetToDefault = () => {
  if (treeRef.value) {
    const keySet = new Set(defaultCheckedKeys);
    // 级联向上补全（防止默认值遗漏父节点）
    for (const key of [...keySet]) {
      getParentIds(key).forEach((pid) => keySet.add(pid));
    }
    const finalKeys = [...keySet];
    treeRef.value.setCheckedKeys(finalKeys, false);
    checkedKeys.value = finalKeys;
    activePageId.value = "page:system:user";
    ElMessage.info("已重置为默认权限");
  }
};

const exportPermissions = () => {
  const leafKeys = treeRef.value?.getCheckedKeys(true) || [];
  const allKeys = checkedKeys.value;
  console.table({
    "叶子权限（操作级）": leafKeys,
    全部勾选节点: allKeys,
  });
  ElMessage.success("权限列表已输出到控制台（F12 查看）");
};

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(checkedKeys.value.join(", "));
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败，请手动复制");
  }
};

// ============================================================
//  8. 生命周期：挂载时确保级联一致性
// ============================================================
onMounted(() => {
  nextTick(() => {
    if (treeRef.value) {
      let keys = treeRef.value.getCheckedKeys(false);
      const keySet = new Set(keys);
      // 级联向上补全（防止 defaultCheckedKeys 遗漏父节点）
      for (const key of [...keySet]) {
        getParentIds(key).forEach((pid) => keySet.add(pid));
      }
      const finalKeys = [...keySet];
      checkedKeys.value = finalKeys;
      treeRef.value.setCheckedKeys(finalKeys, false);
    }
  });
});
</script>

<style scoped>
.permission-sandbox {
  display: flex;
  height: 90vh;
  padding: 20px;
  gap: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* ---------- 左侧权限面板 ---------- */
.permission-panel {
  flex: 0 0 380px;
  border-right: 1px solid #e4e7ed;
  padding-right: 20px;
  display: flex;
  flex-direction: column;
}

.panel-title {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.panel-desc {
  margin: 0 0 16px 0;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

:deep(.el-tree) {
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  padding: 8px 0;
  flex: 1;
  overflow-y: auto;
}

.panel-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

/* ---------- 右侧试验场 ---------- */
.preview-area {
  flex: 1;
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  overflow-y: auto;
}

.preview-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #303133;
}

.preview-section {
  background: #fff;
  padding: 16px 20px;
  border-radius: 6px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.section-label {
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
  font-size: 14px;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.nav-tag {
  cursor: default;
  min-width: 80px;
  text-align: center;
}

.no-perm-hint {
  color: #909399;
  font-size: 12px;
  margin-left: 4px;
}

/* 页面预览 */
.page-preview {
  padding: 8px 0;
}

.page-current {
  margin: 0 0 15px 0;
  color: #606266;
  font-size: 14px;
}

.button-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.empty-perm-alert {
  margin-top: 16px;
}

/* 调试面板 */
.debug-panel {
  background: #ecf5ff;
  padding: 12px 16px;
  border-radius: 6px;
  border: 1px solid #d9ecff;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #409eff;
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
