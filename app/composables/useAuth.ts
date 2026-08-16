// composables/useAuth.ts
import { useAuthStore } from "~~/app/stores/auth";
import { usePermissionStore } from "~~/app/stores/permission";

/** 弹窗引用，避免重复弹出 */
let loginBoxInstance: Promise<unknown> | null = null;

/**
 * 统一认证逻辑 composable
 * @description 集中管理登录跳转、登出、未授权处理，供组件 / 中间件 / 插件调用
 */
export function useAuth() {
  const authStore = useAuthStore();
  const permissionStore = usePermissionStore();
  const config = useRuntimeConfig();

  /**
   * 直接跳转到外部登录页（内部方法）
   * @description 携带当前路径作为 redirect 参数，登录成功后回跳
   * @param redirectPath - 登录成功后的回跳路径
   * @returns 无返回值
   */
  function navigateToLogin(redirectPath: string): void {
    const LOGIN_BASE = config.public.loginBase;
    if (!LOGIN_BASE) throw new Error("LOGIN_BASE 未配置");

    navigateTo(
      `${LOGIN_BASE}/login?redirect=${encodeURIComponent(redirectPath)}`,
      { external: true },
    );
  }

  /**
   * 弹出登录确认弹窗
   * @description 用户可选择「立即登录」跳转登录页，或「暂不登录」关闭弹窗
   * @param redirectPath - 登录成功后的回跳路径，默认取当前页面路径
   * @returns 无返回值
   */
  function login(redirectPath?: string): void {
    if (loginBoxInstance) return;

    const redirect =
      redirectPath ||
      (process.client
        ? window.location.pathname + window.location.search
        : "/");

    loginBoxInstance = ElMessageBox.confirm(
      "访问该页面需要先登录，是否立即登录？",
      "登录提示",
      {
        confirmButtonText: "立即登录",
        cancelButtonText: "暂不登录",
        type: "warning",
      },
    )
      .then(() => {
        navigateToLogin(redirect);
      })
      .catch(() => {
        // 用户选择「暂不登录」，返回上一个安全页面
        const router = useRouter();
        router.back();
      })
      .finally(() => {
        loginBoxInstance = null;
      });
  }

  /**
   * 登出
   * @description 清空 token 和权限，弹出登录提示
   * @returns 无返回值
   */
  function logout(): void {
    console.log("登出", authStore);
    authStore.clearToken();
    permissionStore.clearPermissions();
    ElMessage.success("已退出登录");
    login("/");
  }

  /**
   * 处理接口 401 未授权响应
   * @description 仅轻提示 + 清登录态，不弹窗不跳转（区别于页面级无权限的 login 弹窗），
   *              避免接口失败打断用户当前操作
   * @returns 无返回值
   */
  function handleUnauthorized(): void {
    authStore.clearToken();
    permissionStore.clearPermissions();
    ElMessage.warning("登录已过期，请重新登录");
  }

  return {
    /** 当前是否已登录 */
    isLoggedIn: authStore.isLoggedIn,
    /** 弹出登录确认弹窗 */
    login,
    /** 登出并弹出登录提示 */
    logout,
    /** 处理 401 未授权 */
    handleUnauthorized,
  };
}
