// plugins/loading.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  const loadingStore = useLoadingStore();

  // 首次加载和后续导航都会触发
  nuxtApp.hook("page:loading:start", () => {
    console.log("页面加载开始");
    loadingStore.setLoading(true);
  });

  nuxtApp.hook("page:loading:end", () => {
    console.log("页面加载结束");
    loadingStore.setLoading(false);
  });

  // 错误处理
  nuxtApp.hook("app:error", () => {
    loadingStore.setLoading(false);
  });
});
