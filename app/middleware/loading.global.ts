// middleware/loading.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const loading = useLoadingStore();
  console.log(to.path);
  if (to.path === "/agent") {
    loading.isFullLoading = true;
  }
});
