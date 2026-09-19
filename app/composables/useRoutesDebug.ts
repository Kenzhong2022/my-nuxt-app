/**
 * 路由调试 / 菜单同步工具
 * - logRegisteredRoutes: 浏览器控制台打印当前已注册的完整路由表
 * - syncRoutesToServer:  将当前路由上报服务端，同步 menus 表最新菜单内容
 *   （仅处理携带 definePageMeta 的路由：缺失菜单补建、menu_name 为空补齐，已有名称不覆盖）
 */

/** 同步结果统计 */
export interface MenuSyncResult {
  /** 补建的菜单行数 */
  inserted: number;
  /** 补齐 menu_name 的行数 */
  updated: number;
  /** 跳过的路由数（无 meta 或名称已配置） */
  skipped: number;
}

interface MenuSyncResponse {
  code: number;
  msg: string;
  data: MenuSyncResult;
}

export function useRoutesDebug() {
  /**
   * 控制台打印当前注册的路由（path / name / meta），仅 dev 环境输出
   */
  function logRegisteredRoutes(): void {
    if (!import.meta.dev) return;

    const router = useRouter();
    const routes = router.getRoutes().map((r) => ({
      path: r.path,
      name: String(r.name ?? '-'),
      meta: r.meta && Object.keys(r.meta).length > 0 ? JSON.stringify(r.meta) : '',
    }));
    // console.table(routes);
  }

  /**
   * 上报当前注册路由至服务端，同步 menus 表最新菜单内容
   * @returns 同步统计（新增 / 补名 / 跳过）
   */
  async function syncRoutesToServer(): Promise<MenuSyncResult> {
    const router = useRouter();
    // 仅上报具名路由（'/' 根重定向无 name，跳过）；meta 原样透传由服务端判定
    const routes = router
      .getRoutes()
      .filter((r) => !!r.name)
      .map((r) => ({
        path: r.path,
        name: String(r.name),
        meta: r.meta && Object.keys(r.meta).length > 0 ? { ...r.meta } : null,
      }));

    const res = await $fetch<MenuSyncResponse>('/api/menus/sync', {
      method: 'POST',
      body: { routes },
    });
    return res.data;
  }

  return { logRegisteredRoutes, syncRoutesToServer };
}
