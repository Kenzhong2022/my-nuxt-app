// middleware/analytics.global.ts
import type { TrackVisitRequest } from "~~/types/analytics/requests";

export default defineNuxtRouteMiddleware((to, from) => {
  if (!import.meta.client) {
    return;
  }

  if (to.fullPath === from.fullPath) {
    return;
  }

  console.log("执行上报");

  // 构建请求体
  let body: TrackVisitRequest = {
    page: to.fullPath,
    userAgent: navigator.userAgent,
    timestamp: Date.now(),
  };

  // 从 localStorage 读取会话 ID
  const sessionId = localStorage.getItem("session_id") || "";
  body = { ...body, sessionId };

  $fetch("/api/public/analytics/track-visit", {
    method: "POST",
    body,
  })
    .then((res) => {
      console.log("上报成功:");
      // 存储会话 ID
      localStorage.setItem("session_id", res.data.sessionId);
    })
    .catch((err) => {
      console.warn("上报失败:", err);
    });
});
