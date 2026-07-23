// middleware/loading.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // 服务端
  if (import.meta.server) {
    return;
  }

  // 路由变化时触发
  console.log("路由变化", to.path, "=>", from.path);
  if (to.path === from.path) return;
  const loading = useLoadingStore();
  loading.setLoading(true);
});
