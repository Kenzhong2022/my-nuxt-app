// app/plugins/fetch.ts
export default defineNuxtPlugin((nuxtApp) => {
  globalThis.$fetch = $fetch.create({
    // 1️⃣ 请求发送前
    onRequest({ request, options }) {
      // 添加 Token、自定义头、修改 URL 等
      const token = process.client
        ? localStorage.getItem("access_token")
        : undefined;
      const headers = new Headers(options.headers);

      // 有token才添加鉴权头
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
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

      // 针对 401 未授权：清除 Token 并跳转登录页
      if (response.status === 401) {
        if (process.client) {
          localStorage.removeItem("access_token");
          // 使用 nuxtApp 实例跳转（注意在插件中导入 navigateTo）
          //   nuxtApp.$router?.push("/login");
          // 或者直接使用 window.location（但会刷新页面）
          window.location.href = "http://localhost:3001/login";
        }
      }

      // 针对 403 无权限：提示用户
      if (response.status === 403) {
        if (process.client) {
          // 弹窗提示
          alert("您没有权限执行此操作");
        }
      }

      // 针对 500 服务器错误：统一报错提示
      if (response.status >= 500) {
        // 可以统一上报错误日志到 Sentry 等
        // reportError(response._data)
      }

      // 你也可以修改 response._data 统一错误格式，让调用方捕获到统一结构
      // response._data = { message: response._data?.message || '服务异常' }
    },
  });
});
