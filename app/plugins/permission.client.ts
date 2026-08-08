/**
 * ============================================================
 * 权限插件（客户端）
 * ============================================================
 *
 * 在客户端全局挂载 $hasPermission，方便模板中直接使用
 * 例: v-if="$hasPermission('action:system:user:delete')"
 *
 * 注意: 此插件仅在客户端运行，避免 SSR 水合不匹配
 */
export default defineNuxtPlugin(() => {
  const permissionStore = usePermissionStore()

  return {
    provide: {
      hasPermission: permissionStore.hasPermission,
      hasPageAccess: permissionStore.hasPageAccess,
      hasAnyPermission: permissionStore.hasAnyPermission,
    },
  }
})
