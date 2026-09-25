/**
 * 路由调试工具
 * - logRegisteredRoutes: 浏览器控制台打印当前已注册的完整路由表
 * - saveRoutesToSession: 将当前注册路由存入 sessionStorage（key: routes_debug），仅供本地调试排查
 */

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
   * 将当前注册路由序列化后存入 sessionStorage，不上报服务端
   */
  function saveRoutesToSession(): void {
    const router = useRouter();
    // 仅存具名路由（'/' 根重定向无 name，跳过）
    const routes = router
      .getRoutes()
      .filter((r) => !!r.name)
      .map((r) => ({
        path: r.path,
        name: String(r.name),
        meta: r.meta && Object.keys(r.meta).length > 0 ? { ...r.meta } : null,
      }));

    sessionStorage.setItem('routes_debug', JSON.stringify(routes));
  }

  return { logRegisteredRoutes, saveRoutesToSession };
}
