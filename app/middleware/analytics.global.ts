// middleware/analytics.global.ts
import type { TrackVisitRequest } from "~~/types/analytics/requests";

export default defineNuxtRouteMiddleware((to, from) => {
  // 打印路由信息
  console.group(`[Analytics Middleware] ${from.fullPath} → ${to.fullPath}`);
  console.log("目标路由:", to.meta.title);
  console.log("来源路由:", from.meta.title);
  console.log("执行环境:", import.meta.client ? "客户端" : "服务端");

  if (!import.meta.client) {
    console.log("结果: SSR 跳过");
    console.groupEnd();
    return;
  }

  if (to.fullPath === from.fullPath) {
    console.log("结果: 同路由，跳过");
    console.groupEnd();
    return;
  }

  console.log("结果: 执行上报");

  // 构建请求体
  let body: TrackVisitRequest = {
    page: to.fullPath,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // 从 localStorage 读取会话 ID
  const sessionId = localStorage.getItem("session_id") || "";
  body = { ...body, sessionId };
  console.log("上报体:", body);

  $fetch("/api/public/analytics/track-visit", {
    method: "POST",
    body,
  })
    .then((res) => {
      console.log("上报成功:", res.data.sessionId);
      // 存储会话 ID
      localStorage.setItem("session_id", res.data.sessionId);
      console.groupEnd();
    })
    .catch((err) => {
      console.warn("上报失败:", err);
      console.groupEnd();
    });
});
