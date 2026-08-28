<template>
  <div class="permission-admin">
    <h2 class="page-title">角色权限管理</h2>
    <p class="page-desc">
      选择角色后在左侧权限树中勾选权限，点击「保存」将配置写入数据库。
    </p>

    <div class="admin-layout">
      <!-- 左侧：角色选择 + 权限树 -->
      <aside class="tree-panel">
        <div class="panel-header">
          <h3>权限配置</h3>
        </div>

        <!-- 角色选择 -->
        <div class="role-selector">
          <el-select
            v-model="currentRoleId"
            placeholder="选择角色"
            style="width: 100%"
            @change="onRoleChange"
          >
            <el-option
              v-for="role in roleList"
              :key="role.id"
              :label="`${role.name}（${role.code}）`"
              :value="role.id"
            >
              <span>{{ role.name }}</span>
              <el-tag
                size="small"
                :type="role.status === 1 ? 'success' : 'danger'"
                style="margin-left: 0.5rem"
              >
                {{ role.status === 1 ? "启用" : "禁用" }}
              </el-tag>
            </el-option>
          </el-select>
        </div>

        <!-- 权限树 -->
        <el-tree
          ref="treeRef"
          :data="_rawTree"
          :props="treeFieldMap"
          node-key="id"
          show-checkbox
          check-strictly
          :default-expand-all="true"
          @check="
            (_, info) => onPermissionChange(info.checkedKeys as string[])
          "
        />

        <div class="panel-actions">
          <el-button
            size="small"
            type="primary"
            :loading="saving"
            :disabled="!currentRoleId"
            @click="saveToDB"
          >
            保存到数据库
          </el-button>
          <el-button size="small" :disabled="!currentRoleId" @click="resetToDB">
            还原
          </el-button>
          <el-button size="small" :disabled="!currentRoleId" @click="clearAll">
            全部清空
          </el-button>
        </div>
      </aside>

      <!-- 右侧：角色信息 + 权限预览 -->
      <main class="preview-panel">
        <h3 class="preview-title">权限预览</h3>

        <!-- 当前角色信息 -->
        <section class="preview-card" v-if="currentRole">
          <div class="card-label">当前角色</div>
          <div class="role-info">
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="角色名称">
                {{ currentRole.name }}
              </el-descriptions-item>
              <el-descriptions-item label="角色编码">
                {{ currentRole.code }}
              </el-descriptions-item>
              <el-descriptions-item label="描述">
                {{ currentRole.description || "—" }}
              </el-descriptions-item>
              <el-descriptions-item label="权限数">
                {{ checkedKeys.length }} 项
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </section>

        <section class="preview-card" v-else>
          <el-empty description="请在左侧选择角色" />
        </section>

        <!-- 导航菜单预览 -->
        <section class="preview-card" v-if="currentRole">
          <div class="card-label">页面访问权限</div>
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
        <section class="preview-card" v-if="currentRole">
          <div class="card-label">操作按钮权限</div>
          <el-tabs v-model="activePageId" type="border-card">
            <el-tab-pane
              v-for="page in pageMenus"
              :key="page.id"
              :label="page.label"
              :name="page.id"
            >
              <div class="page-content">
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
                  class="mt-1rem"
                >
                  当前页面没有任何操作权限，请在左侧勾选「{{
                    page.label
                  }}」下的按钮权限。
                </el-alert>
              </div>
            </el-tab-pane>
          </el-tabs>
        </section>

        <!-- 当前权限列表 -->
        <section class="debug-card" v-if="currentRole">
          <div class="debug-header">
            <span>当前已勾选权限（{{ checkedKeys.length }} 个）</span>
            <el-button size="small" text @click="copyKeys">复制 ID</el-button>
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
  PermissionNode,
  PermissionTree,
} from "~~/types/permission";
import type { RoleWithPermissions, RoleListResponse } from "~~/types/role";
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

type ElTagProps = InstanceType<typeof ElTag>["$props"];
type ElTagType = ElTagProps["type"];

/** 权限树数据：定义系统中所有可配置的权限节点 */
const _rawTree: PermissionNode[] = [
  {
    id: "module:system",
    label: "系统管理",
    children: [
      {
        id: "page:system:user",
        label: "用户管理",
        children: [
          {
            id: "action:system:user:create",
            label: "新增用户",
          },
          { id: "action:system:user:edit", label: "编辑用户" },
          {
            id: "action:system:user:delete",
            label: "删除用户",
          },
          {
            id: "action:system:user:export",
            label: "导出用户",
          },
        ],
      },
      {
        id: "page:system:role",
        label: "角色管理",
        children: [
          {
            id: "action:system:role:create",
            label: "新增角色",
          },
          {
            id: "action:system:role:assign",
            label: "分配权限",
          },
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
          {
            id: "action:content:article:publish",
            label: "发布文章",
          },
          {
            id: "action:content:article:audit",
            label: "审核文章",
          },
          {
            id: "action:content:article:delete",
            label: "删除文章",
          },
        ],
      },
    ],
  },
];

const permissionTree: PermissionTree = readonly(_rawTree);
const treeFieldMap = { children: "children", label: "label" };

/** Tree 组件引用 */
const treeRef = ref();
/** 角色列表（含权限） */
const roleList = ref<RoleWithPermissions[]>([]);
/** 当前选中的角色 ID */
const currentRoleId = ref<number | null>(null);
/** 当前角色的已勾选权限 */
const checkedKeys = ref<string[]>([]);
/** 当前激活的预览页面 */
const activePageId = ref<string>("page:system:user");
/** 保存中状态 */
const saving = ref(false);
/** 加载中状态 */
const loading = ref(false);

/**
 * 当前选中的角色对象
 * @returns 从角色列表中查找匹配的角色，未找到返回 null
 */
const currentRole = computed(
  () => roleList.value.find((r) => r.id === currentRoleId.value) || null,
);

const checker = computed(() => createPermissionChecker(checkedKeys.value));
const pageMenus = computed(() => extractPageMenus(permissionTree));

/**
 * 判断单个权限是否生效
 * @param id - 权限 ID
 * @returns 权限是否生效
 */
function hasPermission(id: string): boolean {
  return checker.value.hasPermission(id);
}
/**
 * 判断页面是否有访问权限
 * @param id - 页面权限 ID
 * @returns 是否有访问权限
 */
function hasPageAccess(id: string): boolean {
  return checker.value.hasPageAccess(id);
}
/**
 * 判断某页面下是否至少有一个操作权限
 * @param pageId - 页面权限 ID
 * @returns 是否至少有一个操作权限
 */
function hasAnyPageButton(pageId: string): boolean {
  const buttons = getPageButtons(pageId);
  return buttons.some((btn) => hasPermission(btn.id));
}

/**
 * 获取指定页面下的所有操作按钮
 * @param pageId - 页面权限 ID
 * @returns 按钮配置数组
 */
function getPageButtons(pageId: string) {
  return getPageActions(permissionTree, pageId);
}

/**
 * 拉取角色列表，默认选中第一个角色
 * @description 从后端获取所有角色及权限，自动选中第一个角色
 * @returns 无返回值
 */
async function fetchRoles(): Promise<void> {
  loading.value = true;
  try {
    const res = await $fetch<RoleListResponse>("/api/public/roles/list");
    const list = res?.data ?? [];
    roleList.value = list;
    if (list.length > 0 && currentRoleId.value === null) {
      currentRoleId.value = list[0]!.id;
      onRoleChange(currentRoleId.value);
    }
  } catch (err) {
    console.error("获取角色列表失败:", err);
    ElMessage.error("获取角色列表失败");
  } finally {
    loading.value = false;
  }
}

/** 将当前勾选的权限保存到数据库 */
async function saveToDB() {
  if (!currentRoleId.value) return;
  saving.value = true;
  try {
    await $fetch(`/api/public/roles/${currentRoleId.value}/permissions`, {
      method: "PUT",
      body: { permissions: checkedKeys.value },
    });
    // 同步本地缓存
    if (currentRole.value) {
      currentRole.value.permissions = [...checkedKeys.value];
    }
    ElMessage.success("权限已保存到数据库");
  } catch (err) {
    console.error("保存权限失败:", err);
    ElMessage.error("保存权限失败");
  } finally {
    saving.value = false;
  }
}

/**
 * 切换角色时，加载该角色的权限到树
 * @param roleId - 要切换到的角色 ID
 * @returns 无返回值
 */
function onRoleChange(roleId: number): void {
  const role = roleList.value.find((r) => r.id === roleId);
  if (!role) return;

  checkedKeys.value = [...role.permissions];
  nextTick(() => {
    treeRef.value?.setCheckedKeys(role.permissions, false);
  });
}

/**
 * Tree 勾选事件：自定义级联逻辑
 * @description check-strictly 模式下手动实现级联：取消父节点自动取消子孙，勾选子节点自动补全父节点
 * @param checked - 当前所有勾选的权限 ID 数组
 * @returns 无返回值
 */
function onPermissionChange(checked: string[]): void {
  if (!treeRef.value) return;

  const newChecked = new Set<string>(checked);
  const previousChecked = new Set<string>(checkedKeys.value);

  const uncheckedKeys = [...previousChecked].filter((k) => !newChecked.has(k));
  for (const key of uncheckedKeys) {
    const node = findNodeById(permissionTree, key);
    const descendants = collectDescendantIds(node);
    descendants.forEach((did) => newChecked.delete(did));
  }

  const keysToProcess = [...newChecked];
  for (const key of keysToProcess) {
    const parents = getParentIds(permissionTree, key);
    parents.forEach((pid) => newChecked.add(pid));
  }

  const finalKeys = [...newChecked];
  checkedKeys.value = finalKeys;

  nextTick(() => {
    treeRef.value?.setCheckedKeys(finalKeys, false);
  });
}

/**
 * 根据权限层级返回对应的 tag 颜色类型
 * @param key - 权限 ID，如 "action:system:user:create"
 * @returns {ElTagType} action→primary, page→success, module→warning
 */
function getTagType(key: string): ElTagType {
  if (key.startsWith("action:")) return "primary";
  if (key.startsWith("page:")) return "success";
  return "warning";
}

/**
 * 模拟操作按钮点击，根据权限判断是否可执行
 * @param btn - 按钮配置，包含权限 ID 和显示文本
 * @param btn.id - 权限 ID
 * @param btn.label - 按钮显示文本
 * @returns 无返回值
 */
function simulateAction(btn: { id: string; label: string }): void {
  if (hasPermission(btn.id)) {
    ElMessage.success(`执行了「${btn.label}」操作`);
  } else {
    ElMessage.error(`无权限执行「${btn.label}」`);
  }
}

/**
 * 还原为数据库中的权限配置
 * @description 放弃当前修改，重新从角色列表中读取该角色的权限
 * @returns 无返回值
 */
function resetToDB(): void {
  if (currentRole.value) {
    onRoleChange(currentRole.value.id);
    ElMessage.info("已还原为数据库中的配置");
  }
}

/**
 * 清空所有勾选
 * @description 清空树和 checkedKeys，需手动点击保存才生效
 * @returns {void} 无返回值
 */
function clearAll(): void {
  checkedKeys.value = [];
  nextTick(() => treeRef.value?.setCheckedKeys([], false));
  ElMessage.info("已清空（未保存，请点击「保存到数据库」生效）");
}

/**
 * 复制当前权限 ID 列表到剪贴板
 * @description 将 checkedKeys 以逗号分隔写入剪贴板
 * @returns 无返回值
 */
async function copyKeys(): Promise<void> {
  try {
    await navigator.clipboard.writeText(checkedKeys.value.join(", "));
    ElMessage.success("已复制到剪贴板");
  } catch {
    ElMessage.error("复制失败");
  }
}

onMounted(fetchRoles);
</script>

<style scoped>
.permission-admin {
  padding: 1.5rem;
  max-width: 87.5rem;
  margin: 0 auto;
}

.page-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.page-desc {
  margin: 0 0 1.5rem 0;
  font-size: 0.875rem;
  color: var(--el-text-color-secondary);
  line-height: 1.6;
}

.admin-layout {
  display: flex;
  gap: 1.5rem;
  height: calc(100vh - 10rem);
}

/* ---------- 左侧面板 ---------- */
.tree-panel {
  flex: 0 0 23.75rem;
  border: 0.0625rem solid var(--el-border-color);
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.panel-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.role-selector {
  margin-bottom: 0.75rem;
}

::deep(.el-tree) {
  flex: 1;
  overflow-y: auto;
  border: 0.0625rem solid var(--el-border-color-lighter);
  border-radius: 0.25rem;
  padding: 0.5rem;
  background: var(--el-fill-color-blank);
}

.panel-actions {
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

/* ---------- 右侧预览面板 ---------- */
.preview-panel {
  flex: 1;
  background: var(--el-bg-color-page);
  border-radius: 0.5rem;
  padding: 1.25rem;
  overflow-y: auto;
}

.preview-title {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.preview-card {
  background: var(--el-bg-color-overlay);
  padding: 1rem;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  box-shadow: var(--el-box-shadow-light);
}

.card-label {
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.nav-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.nav-item {
  cursor: default;
  min-width: 5rem;
  text-align: center;
}

.muted {
  color: var(--el-text-color-secondary);
  font-size: 0.75rem;
  margin-left: 0.25rem;
}

.page-content {
  padding: 0.25rem 0;
}

.btn-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.mt-1rem {
  margin-top: 1rem;
}

/* ---------- 调试面板 ---------- */
.debug-card {
  background: var(--el-color-primary-light-9);
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 0.0625rem solid var(--el-color-primary-light-8);
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  color: var(--el-color-primary);
  margin-bottom: 0.625rem;
}

.debug-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.debug-tag {
  font-family: "Courier New", monospace;
}
</style>
