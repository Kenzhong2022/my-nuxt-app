// plugins/loading.client.ts
export default defineNuxtPlugin((nuxtApp) => {
  const { setLoading } = useRouteLoading();

  // 首次加载和后续导航都会触发
  nuxtApp.hook("page:loading:start", () => {
    setLoading(true);
  });

  nuxtApp.hook("page:loading:end", () => {
    setLoading(false);
  });

  // 错误处理
  nuxtApp.hook("app:error", () => {
    setLoading(false);
  });
});
