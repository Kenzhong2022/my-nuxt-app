// app/plugins/fetch.ts
// 全局 $fetch 封装：统一注入 X-Request-ID，401 时单飞刷新会话并重放原请求一次
// （token 存于 HttpOnly cookie 由浏览器自动携带，前端不再注入 Authorization 头）
import { reloadIdentity, useAuth } from '~/composables/useAuth';

/** 认证端点不参与「刷新 → 重放」，防止刷新失败引发循环 */
const AUTH_ENDPOINTS = ['/api/token', '/api/refresh-token', '/api/logout'];

/** 单飞刷新：并发 401 只触发一次 /api/refresh-token，全部等待同一结果 */
let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= $fetch('/api/refresh-token', { method: 'POST' })
    .then(() => true)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export default defineNuxtPlugin(() => {
  const apiFetch = $fetch.create({
    // 1️⃣ 请求发送前
    onRequest({ request, options }) {
      const headers = new Headers(options.headers);
      headers.set(
        'X-Request-ID',
        crypto.randomUUID?.() || Date.now().toString(), // 请求ID
      );
      options.headers = headers;
    },

    // 2️⃣ 请求发送失败（网络断连、DNS 解析失败等，非 HTTP 状态码错误）
    onRequestError({ request, options, error }) {
      console.error("[请求网络错误]", error);
      if (import.meta.client) {
        ElMessage?.error?.("网络连接异常，请检查网络设置");
      }
    },

    // 3️⃣ 响应成功返回（HTTP 状态码 2xx）
    onResponse({ request, options, response }) {
      // 统一解构后端数据（例如后端返回格式为 { code: 0, data: {...} }）
      if (response._data?.code === 0) {
        // 直接返回 data 字段，后续调用者拿到的就是业务数据
        response._data = response._data.data;
      } else if (
        response._data?.code !== undefined &&
        response._data.code !== 0
      ) {
        // 如果后端返回了非0的业务错误码，可以在这里统一转为异常抛出
        // throw new Error(response._data.message || '业务处理失败')
        // 或者不改动，让调用方自行处理
      }
    },

    // 4️⃣ 响应返回错误（HTTP 状态码 >= 400，如 401, 404, 500 等）仅做日志与提示，
    //    401 的「刷新 → 重放」由下方顶层包装统一处理
    onResponseError({ request, options, response }) {
      console.error(`[响应错误] ${request}`, response.status, response._data);
      if (import.meta.client) {
        // 403 无权限
        if (response.status === 403) {
          ElMessage.error("您没有权限执行此操作");
        }

        // 500 等服务器错误可上报日志
        if (response.status >= 500) {
          // reportError(response._data);
        }
      }
    },
  });

  /**
   * 顶层包装：401 且未重放过时，单飞刷新会话后重放原请求一次
   * - 刷新成功：火后不理 reloadIdentity（重同步菜单/权限，兜底多标签页身份滞留）→ 重放
   * - 刷新失败：handleUnauthorized 清登录态并提示，原错误继续上抛
   */
  const fetchWithRefresh = async (request: any, options: any = {}) => {
    try {
      return await apiFetch(request, options);
    } catch (err: any) {
      const isAuthEndpoint =
        typeof request === 'string' && AUTH_ENDPOINTS.some((p) => request.startsWith(p));
      // 仅客户端做无感续期（SSR 阶段刷新写不进浏览器 cookie）；认证端点与已重放请求直接上抛
      if (
        err?.status !== 401 ||
        isAuthEndpoint ||
        options?._retried ||
        import.meta.server
      ) {
        throw err;
      }

      const refreshed = await refreshSession();
      if (!refreshed) {
        const { handleUnauthorized } = useAuth();
        handleUnauthorized();
        throw err;
      }
      reloadIdentity();
      return apiFetch(request, { ...options, _retried: true });
    }
  };

  globalThis.$fetch = fetchWithRefresh as typeof $fetch;
});
