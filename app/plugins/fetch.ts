// app/plugins/fetch.ts
import { useAuthStore } from "~~/app/stores/auth";
export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = $fetch.create({
    // 1️⃣ 请求发送前
    onRequest({ request, options }) {
      // 仅在客户端从 store 获取 token（服务端没有 store 持久化）
      if (process.client) {
        const authStore = useAuthStore();
        const token = authStore.token; // 从 store 读取

        if (token) {
          const headers = new Headers(options.headers || {});
          headers.set("Authorization", `Bearer ${token}`);
          options.headers = headers;
        }
      }

      const headers = new Headers(options.headers);

      headers.set(
        "X-Request-ID",
        crypto.randomUUID?.() || Date.now().toString(), // 请求ID
      );

      options.headers = headers;
    },

    // 2️⃣ 请求发送失败（网络断连、DNS 解析失败等，非 HTTP 状态码错误）
    onRequestError({ request, options, error }) {
      console.error("[请求网络错误]", error);
      // 可以在这里做重试逻辑（谨慎使用）
      // 或提示用户检查网络
      if (process.client) {
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

      // 例如：统一处理分页结构
      // if (response._data?.list && response._data?.total) {
      //   response._data = { items: response._data.list, total: response._data.total }
      // }
    },

    // 4️⃣ 响应返回错误（HTTP 状态码 >= 400，如 401, 404, 500 等）
    onResponseError({ request, options, response }) {
      console.error(`[响应错误] ${request}`, response.status, response._data);
      if (process.client) {
        // 401 未授权：清除 token 并跳转登录
        if (response.status === 401) {
          console.log("401 未授权");
          const { handleUnauthorized } = useAuth();
          handleUnauthorized();
        }

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
});
