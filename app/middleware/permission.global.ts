/**
 * ============================================================
 * 全局页面权限守卫（数据驱动，页面无需硬编码 requiredPermission）
 * ============================================================
 *
 * 数据来源: GET /api/public/getRouters —— 按角色下发的菜单路由树（admin 全量，
 * 其余角色由 role_permissions 页面权限推导），存于 userInfo store（app.vue 首次进入拉取）；
 * 未登录一律按访客角色下发访客菜单；按钮级权限由页面内 v-hasPermi 指令判定。
 *
 * 规则:
 *   1. 服务端跳过（客户端体验层管控，接口层另有鉴权兜底）
 *   2. 超管（admin / *:*:*）放行；用户信息未加载（游客）放行
 *   3. 角色未分配任何菜单（routers 为空）→ 不启用页面级管控，仅按钮指令生效
 *   4. 目标路由的 matched 路径模式不在角色菜单集合内 → /403（/403 自身放行防重定向循环）
 */
import type { RuoYiRoute } from '~~/types/user';

export default defineNuxtRouteMiddleware(async (to) => {
  // 权限数据来自接口 + 本地 store，仅在客户端校验
  if (process.server) return;

  const userInfoStore = useUserInfoStore();
  // 游客或超管不启用页面级管控
  if (!userInfoStore.isLoaded || userInfoStore.isAdmin) return;

  // /403 自身放行，避免重定向循环
  if (to.path === '/403') return;
  // 未匹配到任何页面路由（真 404）交给错误页处理
  if (to.matched.length === 0) return;

  // 拉取角色菜单路由表（与布局侧边栏同源：userInfo store，callOnce 已拉取则直接复用）
  if (userInfoStore.routers.length === 0) await userInfoStore.getRouters();
  // 角色未分配任何菜单 → 不启用页面级管控（仅按钮指令生效）
  if (userInfoStore.routers.length === 0) return;

  // 扁平化角色可访问路径（含 hidden 页面，如商品详情；子路径可能是相对路径，需拼接父级）
  const allowed = new Set<string>();
  function collect(list: RuoYiRoute[], base: string) {
    for (const route of list) {
      const fullPath = route.path.startsWith('/') ? route.path : `${base}/${route.path}`;
      allowed.add(fullPath.replace(/\/+/g, '/'));
      if (route.children?.length) collect(route.children, fullPath);
    }
  }
  collect(userInfoStore.routers, '');

  // 用 matched 的路径模式匹配，兼容 /store/:id() 这类动态路由
  const isAllowed = to.matched.some((record) => allowed.has(record.path.replace(/\/+/g, '/')));
  if (!isAllowed) {
    return navigateTo('/403', { replace: true });
  }
});
