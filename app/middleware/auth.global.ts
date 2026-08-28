// middleware/auth.global.ts
import { useAuthStore } from "~~/app/stores/auth";

/**
 * 前端登录守卫
 * @description 仅当页面通过 definePageMeta 声明了 requiredPermission / requiredPermissionAny 时才要求登录
 */
export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) {
    return;
  }
  // 未声明权限要求的页面，默认公开
  const required = to.meta.requiredPermission;
  const requiredAny = to.meta.requiredPermissionAny;
  if (!required && !requiredAny) return;
  const authStore = useAuthStore();
  if (!authStore.token) {
    console.log("未登录，跳转到登录页", to.fullPath, from.fullPath);
    const { requireLogin } = useAuth();
    requireLogin(to.fullPath);
  } else {
    // 弹窗提示用户有权限访问该页面
    ElMessage.success("经过鉴权，您有权限访问该页面");
  }
});
