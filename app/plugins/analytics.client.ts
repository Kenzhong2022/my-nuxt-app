// plugins/analytics.client.ts
export default defineNuxtPlugin(() => {
  const route = useRoute();

  // 发送首次页面加载的埋点
  $fetch("/api/public/analytics/track-visit", {
    method: "POST",
    body: {
      page: route.fullPath,
      userAgent: navigator.userAgent,
    },
  }).catch((err) => {
    // 静默失败，避免影响用户体验
    console.warn("首次埋点上报失败:", err);
  });
});
