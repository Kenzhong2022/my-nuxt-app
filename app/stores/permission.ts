import { createPermissionChecker } from '~~/app/composables/usePermission';
import type { PermissionResource } from '~~/types/permission';

/**
 * ============================================================
 * 权限状态管理 (Pinia)
 * ============================================================
 *
 * 设计思路:
 *   1. 单一数据源: 所有权限判断都基于 permissions 数组（getInfo 按角色下发）
 *   2. 计算属性缓存: permissionSet 和 checker 通过 computed 缓存，避免重复创建
 *   3. 无本地缓存: 权限完全以服务端下发为准，拉取失败保持为空（失败即异常，不做兜底）
 */

export const usePermissionStore = defineStore('permission', () => {
  // ========== State ==========
  /** 当前用户拥有的所有权限 perm_key（如 page:/system/user、action:/system/user:create；超管为 ["*:*:*"]） */
  const permissions = ref<string[]>([]);

  /** 权限是否已加载（用于防止重复请求） */
  const isLoaded = ref(false);

  /**
   * 全量菜单目录（目录→页面→按钮 三级树，raw permKey 如 page:/system/user）
   * 来源 /api/admin/permissions（仅 admin 可访问），非 admin 恒为空数组；
   * 菜单管理页据此渲染全量菜单树（menus 表已废弃，菜单以 permissions 为准）
   */
  const allPermissions = ref<PermissionResource[]>([]);

  // ========== Getters (Computed) ==========
  /** 扁平化权限集合（O(1) 查找） */
  const permissionSet = computed(() => new Set<string>(permissions.value));

  /** 权限判断器（缓存实例，避免每次调用都重新创建） */
  const checker = computed(() => createPermissionChecker(permissions.value));

  // ========== Actions ==========

  /**
   * 设置权限（getInfo 拉取成功后由 app.vue callOnce 调用）
   */
  const setPermissions = (perms: readonly string[]): void => {
    permissions.value = [...perms];
    isLoaded.value = true;
  };

  /** 保存全量权限目录（启动时由 app.vue callOnce 调用） */
  const setAllPermissions = (list: readonly PermissionResource[]): void => {
    allPermissions.value = [...list];
  };

  /**
   * 尽力拉取全量权限目录（/api/admin/permissions，仅 admin 可访问）
   * 非 admin 403 / 网络异常一律静默跳过，不阻塞启动
   */
  const fetchAllPermissions = async (): Promise<void> => {
    try {
      // useRequestFetch：SSR 内部请求时透传浏览器 cookie（token），客户端等价 $fetch
      const requestFetch = useRequestFetch();
      const res = await requestFetch<{ code: number; message?: string; data: PermissionResource[] }>(
        '/api/admin/permissions',
      );
      if (res.code === 200) setAllPermissions(res.data ?? []);
    } catch {
      // 非 admin（403）或异常：静默跳过，调用方回退角色权限串匹配
    }
  };

  /**
   * 清空权限（登出时调用）
   */
  const clearPermissions = (): void => {
    permissions.value = [];
    isLoaded.value = false;
  };

  // ========== 代理 checker 方法（保持调用方式一致） ==========
  const hasPermission = (id: string): boolean => checker.value.hasPermission(id);
  const hasPageAccess = (id: string): boolean => checker.value.hasPageAccess(id);
  const hasAnyPermission = (ids: readonly string[]): boolean => checker.value.hasAnyPermission(ids);
  const hasAllPermissions = (ids: readonly string[]): boolean => checker.value.hasAllPermissions(ids);

  return {
    // state
    permissions,
    isLoaded,
    allPermissions,
    // getters
    permissionSet,
    // actions
    setPermissions,
    setAllPermissions,
    fetchAllPermissions,
    clearPermissions,
    // proxy methods
    hasPermission,
    hasPageAccess,
    hasAnyPermission,
    hasAllPermissions,
  };
});
