// middleware/auth.global.ts
import { navigateTo } from "#app";
import { isPublicPath } from "~~/utils/whitelist";
import { useAuthStore } from "~~/app/stores/auth";

export default defineNuxtRouteMiddleware((to) => {
  if (process.server) return;
  if (isPublicPath(to.path)) return;
  console.log("需要登录");
  const authStore = useAuthStore(); //暂时不做拦截，方便开发，作于页面拦截功能，后端拦截api权限

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
