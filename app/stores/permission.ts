import type { PermissionId } from "~~/types/permission";
import { createPermissionChecker } from "~~/app/composables/usePermission";

/**
 * ============================================================
 * 权限状态管理 (Pinia)
 * ============================================================
 *
 * 设计思路:
 *   1. 单一数据源: 所有权限判断都基于 permissions 数组
 *   2. 计算属性缓存: permissionSet 和 checker 通过 computed 缓存，避免重复创建
 *   3. 持久化策略: 通过 localStorage 缓存权限数据，刷新页面后自动恢复
 *
 * 说明: 当前无后端，权限数据来源于权限配置页（/admin/permissions）
 *       写入 localStorage 的 `permission_config` 键，store 与配置页共用该键。
 */

/** localStorage 键名（与权限配置页保持一致，单一数据源） */
const CACHE_KEY = "permission_config";

export const usePermissionStore = defineStore("permission", () => {
  // ========== State ==========
  /** 当前用户拥有的所有权限 ID */
  const permissions = ref<PermissionId[]>([]);

  /** 权限是否已加载（用于防止重复请求） */
  const isLoaded = ref(false);

  // ========== Getters (Computed) ==========
  /** 扁平化权限集合（O(1) 查找） */
  const permissionSet = computed(
    () => new Set<PermissionId>(permissions.value),
  );

  /** 权限判断器（缓存实例，避免每次调用都重新创建） */
  const checker = computed(() => createPermissionChecker(permissions.value));

  // ========== Actions ==========

  /**
   * 设置权限（配置页保存或登录后调用）
   * 同时写入本地缓存
   */
  const setPermissions = (perms: readonly PermissionId[]): void => {
    permissions.value = [...perms];
    isLoaded.value = true;
    saveToCache(perms);
  };

  /**
   * 从缓存恢复权限（页面刷新时调用）
   * @returns 是否成功恢复
   */
  const restoreFromCache = (): boolean => {
    const cache = loadFromCache();
    // 只要本地存在配置键（即使为空数组）即视为已加载，使权限管控生效
    if (cache !== null) {
      permissions.value = [...cache];
      isLoaded.value = true;
      return true;
    }
    return false;
  };

  /**
   * 清空权限（登出时调用）
   */
  const clearPermissions = (): void => {
    permissions.value = [];
    isLoaded.value = false;
    removeCache();
  };

  /**
   * 拉取权限（当前无后端，直接从本地配置加载）
   * 保留方法名以便未来接入后端时替换实现
   */
  const fetchPermissions = async (): Promise<PermissionId[]> => {
    restoreFromCache();
    return permissions.value;
  };

  // ========== 代理 checker 方法（保持调用方式一致） ==========
  const hasPermission = (id: PermissionId): boolean =>
    checker.value.hasPermission(id);
  const hasPageAccess = (id: PermissionId): boolean =>
    checker.value.hasPageAccess(id);
  const hasAnyPermission = (ids: readonly PermissionId[]): boolean =>
    checker.value.hasAnyPermission(ids);
  const hasAllPermissions = (ids: readonly PermissionId[]): boolean =>
    checker.value.hasAllPermissions(ids);

  return {
    // state
    permissions,
    isLoaded,
    // getters
    permissionSet,
    // actions
    setPermissions,
    restoreFromCache,
    clearPermissions,
    fetchPermissions,
    // proxy methods
    hasPermission,
    hasPageAccess,
    hasAnyPermission,
    hasAllPermissions,
  };
});

// ========== 本地缓存工具函数 ==========
function saveToCache(perms: readonly PermissionId[]): void {
  if (process.client) {
    localStorage.setItem(CACHE_KEY, JSON.stringify([...perms]));
  }
}

function loadFromCache(): PermissionId[] | null {
  if (process.client) {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // 校验数据有效性：仅保留符合层级命名规则的字符串
          return parsed.filter(
            (k): k is PermissionId =>
              typeof k === "string" &&
              (k.startsWith("module:") ||
                k.startsWith("page:") ||
                k.startsWith("action:")),
          );
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

function removeCache(): void {
  if (process.client) {
    localStorage.removeItem(CACHE_KEY);
  }
}
