/**
 * ============================================================
 * 全局权限路由守卫
 * ============================================================
 *
 * 设计思路:
 *   1. 声明式拦截: 在页面 meta 中声明 requiredPermission，无需在页面内写判断逻辑
 *   2. 懒加载兼容: 权限未加载时先尝试从缓存恢复，再决定是否放行
 *   3. 统一降级: 无权限时统一跳转到 /403 页面，保持体验一致
 *
 * 用法:
 *   definePageMeta({
 *     requiredPermission: 'page:system:user' 
 *   })
 *
 *   // 或满足任意一项即可:
 *   definePageMeta({
 *     requiredPermissionAny: ['page:system:user', 'page:system:admin'] 
 *   })
 */
export default defineNuxtRouteMiddleware((to) => {
  // 权限数据存于 localStorage，仅在客户端校验（与 auth 中间件保持一致）
  if (process.server) return

  const permissionStore = usePermissionStore()

  // 如果权限未加载，尝试从缓存恢复
  if (!permissionStore.isLoaded) {
    const restored = permissionStore.restoreFromCache()
    if (!restored) {
      // 未配置且无缓存，跳过权限检查（由 auth middleware 处理登录态）
      return
    }
  }

  // 页面声明了单一必需权限
  const required = to.meta.requiredPermission as string | undefined
  if (required && !permissionStore.hasPageAccess(required)) {
    return navigateTo('/403', { replace: true })
  }

  // 页面声明了"满足任意一项即可"的权限列表
  const requiredAny = to.meta.requiredPermissionAny as string[] | undefined
  if (requiredAny && !permissionStore.hasAnyPermission(requiredAny)) {
    return navigateTo('/403', { replace: true })
  }
})
