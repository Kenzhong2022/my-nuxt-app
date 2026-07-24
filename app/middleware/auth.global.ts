// middleware/auth.global.ts
import { navigateTo } from "#app";
import { isPublicPath } from "~~/utils/whitelist";
import { useAuthStore } from "~~/app/stores/auth";

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return;

  if (isPublicPath(to.path)) return;

  const authStore = useAuthStore();
  console.log("authStore", authStore.token);

  if (!authStore.token) {
    const config = useRuntimeConfig();
    const LOGIN_BASE = config.public.loginBase;
    if (!LOGIN_BASE) throw new Error("LOGIN_BASE 未配置");
    ElMessage.warning("您因为未登录，无法访问该页面，请先登录后重试。");
    return navigateTo(
      `${LOGIN_BASE}/login?redirect=${encodeURIComponent(to.fullPath)}`,
      { external: true },
    );
  }
});
