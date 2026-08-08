import type {
  ActionButtonConfig,
  PermissionId,
  PermissionNode,
  PermissionTree,
} from "~~/types/permission";

/**
 * ============================================================
 * 权限核心逻辑 Composable
 * ============================================================
 *
 * 设计思路:
 *   1. 扁平化查找: 将权限数组转为 Set，实现 O(1) 时间复杂度判断
 *   2. 前置校验: action 级权限必须同时满足「自身被勾选」+「所属 page 被勾选」
 *   3. 级联推导: 通过 ID 结构解析父子关系（无需遍历树）
 *   4. 纯函数设计: 不依赖 Vue 响应式，可在 SSR/CSR 任意环境运行
 */

/**
 * 从 action ID 推导所属 page ID
 * 例: action:system:user:create → page:system:user
 *
 * @param actionId - action 级权限 ID
 * @returns 所属 page ID，若格式非法则返回 null
 */
export function getParentPageId(actionId: PermissionId): PermissionId | null {
  const parts = actionId.split(":");
  // action:{module}:{page}:{operation} → 必须 4 段
  if (parts.length === 4 && parts[0] === "action") {
    return `page:${parts[1]}:${parts[2]}` as PermissionId;
  }
  return null;
}

/**
 * 从任意节点 ID 推导其所有父节点 ID（从直接父节点到根节点）
 *
 * @param tree - 权限树
 * @param targetId - 目标节点 ID
 * @returns 父节点 ID 数组（从近到远）
 */
export function getParentIds(
  tree: PermissionTree,
  targetId: PermissionId,
): PermissionId[] {
  const parents: PermissionId[] = [];

  const findPath = (
    nodes: readonly PermissionNode[],
    target: PermissionId,
    path: PermissionId[] = [],
  ): boolean => {
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

  findPath(tree, targetId);
  return parents;
}

/**
 * 在树中递归查找指定 ID 的节点
 *
 * @param tree - 权限树
 * @param targetId - 目标节点 ID
 * @returns 找到的节点，不存在则返回 null
 */
export function findNodeById(
  tree: PermissionTree,
  targetId: PermissionId,
): PermissionNode | null {
  for (const node of tree) {
    if (node.id === targetId) return node;
    if (node.children) {
      const found = findNodeById(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 收集某个节点下所有子孙节点的 ID（深度优先，不包含自身）
 *
 * @param node - 起始节点
 * @param result - 结果累加器
 * @returns 子孙节点 ID 数组
 */
export function collectDescendantIds(
  node: PermissionNode | null,
  result: PermissionId[] = [],
): PermissionId[] {
  if (!node || !node.children) return result;
  for (const child of node.children) {
    result.push(child.id);
    collectDescendantIds(child, result);
  }
  return result;
}

/**
 * 从权限树中提取所有 page 级节点
 *
 * @param tree - 权限树
 * @returns page 节点数组（仅含 id 和 label）
 */
export function extractPageMenus(
  tree: PermissionTree,
): Array<{ readonly id: PermissionId; readonly label: string }> {
  const menus: Array<{ readonly id: PermissionId; readonly label: string }> =
    [];

  const walk = (nodes: readonly PermissionNode[]): void => {
    for (const node of nodes) {
      if (node.id.startsWith("page:")) {
        menus.push({ id: node.id, label: node.label });
      }
      if (node.children) walk(node.children);
    }
  };

  walk(tree);
  return menus;
}

/**
 * 获取指定页面下的所有 action 级权限配置
 *
 * @param tree - 权限树
 * @param pageId - 页面 ID
 * @returns 按钮配置数组
 */
export function getPageActions(
  tree: PermissionTree,
  pageId: PermissionId,
): Array<{
  id: PermissionId;
  label: string;
  uiType: ActionButtonConfig["uiType"];
}> {
  const pageNode = findNodeById(tree, pageId);
  if (!pageNode || !pageNode.children) return [];

  return pageNode.children.map((child) => ({
    /** 限制只可读操作 */
    id: child.id,
    label: child.label,
    uiType: getElBtnType(child.id),
  }));
}

/**
 * 根据 action ID 推断按钮 UI 类型
 * 扩展时在此添加映射即可
 *
 * @param actionId - action 权限 ID
 * @returns Element Plus 按钮类型
 */
export function getElBtnType(
  actionId: PermissionId,
): ActionButtonConfig["uiType"] {
  if (actionId.includes(":delete")) return "danger";
  if (actionId.includes(":edit")) return "default";
  if (actionId.includes(":create") || actionId.includes(":publish"))
    return "success";
  if (actionId.includes(":export")) return "info";
  return "primary";
}

/**
 * 创建权限判断器（工厂函数，生成与特定权限集合绑定的判断方法）
 *
 * 设计思路: 将权限数组传入，返回一组纯函数，避免每次判断都重新创建 Set
 *
 * @param permissions - 用户拥有的权限 ID 数组
 * @returns 权限判断方法集合
 */
export function createPermissionChecker(permissions: readonly PermissionId[]) {
  const permissionSet = new Set<PermissionId>(permissions);

  /**
   * 判断单个权限是否生效
   * - action 级: 自身被勾选 且 所属 page 被勾选
   * - page/module 级: 自身被勾选
   */
  const hasPermission = (id: PermissionId): boolean => {
    if (!permissionSet.has(id)) return false;

    if (id.startsWith("action:")) {
      const pageId = getParentPageId(id);
      if (pageId && !permissionSet.has(pageId)) return false;
    }
    return true;
  };

  /** 判断页面是否有访问权 */
  const hasPageAccess = (pageId: PermissionId): boolean => {
    return hasPermission(pageId);
  };

  /** 判断是否拥有任意一项权限（"或"关系） */
  const hasAnyPermission = (ids: readonly PermissionId[]): boolean => {
    return ids.some((id) => hasPermission(id));
  };

  /** 判断是否拥有所有权限（"与"关系） */
  const hasAllPermissions = (ids: readonly PermissionId[]): boolean => {
    return ids.every((id) => hasPermission(id));
  };

  return {
    hasPermission,
    hasPageAccess,
    hasAnyPermission,
    hasAllPermissions,
    permissionSet,
  };
}
