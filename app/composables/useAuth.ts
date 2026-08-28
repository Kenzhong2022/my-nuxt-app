// composables/useAuth.ts
import { storeToRefs } from "pinia";
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
  // storeToRefs 保持 computed 的响应式（直接取属性会变成一次性快照）
  const { isLoggedIn } = storeToRefs(authStore);

  /**
   * 跳转到认证中心授权入口（内部方法）
   * @description 走 OAuth2 授权码模式：未登录时 authorize 会自动 302 到登录页
   *              并透传 client_id 等参数，登录成功后发 code 回调业务方 CallBack
   * @param redirectPath - 登录成功后的回跳路径
   * @returns 无返回值
   */
  function navigateToLogin(redirectPath: string): void {
    const LOGIN_BASE = config.public.loginBase;
    const CLIENT_ID = config.public.clientId;
    const CALLBACK_URL = config.public.callbackUrl;
    if (!LOGIN_BASE || !CLIENT_ID || !CALLBACK_URL)
      throw new Error("登录中心配置不完整（loginBase/clientId/callbackUrl）");

    const url = new URL("/api/auth/authorize", LOGIN_BASE);
    url.searchParams.set("client_id", CLIENT_ID);
    url.searchParams.set("redirect_uri", CALLBACK_URL);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("redirect", redirectPath);

    navigateTo(url.toString(), { external: true });
  }

  /** 当前页面路径（含 query），SSR 阶段兜底 "/" */
  function getCurrentPath(): string {
    return process.client
      ? window.location.pathname + window.location.search
      : "/";
  }

  /**
   * 主动登录：直接跳转认证中心
   * @description 用户明确点击「登录」入口时调用，意图明确，无需确认弹窗
   * @param redirectPath - 登录成功后的回跳路径，默认取当前页面路径
   * @returns 无返回值
   */
  function login(redirectPath?: string): void {
    navigateToLogin(redirectPath || getCurrentPath());
  }

  /**
   * 被动登录：访问受限资源被拦截时弹出确认弹窗
   * @description 用户因访问受保护资源间接触发，可选择「立即登录」跳转认证中心，
   *              或「暂不登录」返回上一个安全页面
   * @param redirectPath - 登录成功后的回跳路径，默认取当前页面路径
   * @returns 无返回值
   */
  function requireLogin(redirectPath?: string): void {
    if (loginBoxInstance) return;

    const redirect = redirectPath || getCurrentPath();

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
    /** 当前是否已登录（响应式 ref） */
    isLoggedIn,
    /** 主动登录：直接跳转认证中心 */
    login,
    /** 访问受限资源被拦截时弹出确认弹窗 */
    requireLogin,
    /** 登出并弹出登录提示 */
    logout,
    /** 处理 401 未授权 */
    handleUnauthorized,
  };
}
