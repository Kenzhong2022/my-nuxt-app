// middleware/analytics.global.ts
export default defineNuxtRouteMiddleware((to, from) => {
  // 仅在客户端执行（避免 SSR 期间运行）
  if (import.meta.client) {
    // 同一路由重复点击（如点击相同导航链接）不重复上报
    if (to.fullPath === from.fullPath) return;

    // 异步上报，不阻塞导航
    $fetch("/api/public/analytics/track-visit", {
      method: "POST",
      body: {
        page: to.fullPath,
        userAgent: navigator.userAgent,
      },
    }).catch((err) => {
      console.warn("埋点上报失败:", err);
    });
  }
});
