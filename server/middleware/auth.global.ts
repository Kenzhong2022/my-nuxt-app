import { createError, getRequestHeader } from "h3";
import { verifyAccessToken } from "~~/server/utils/jwt";

declare module "h3" {
  interface H3EventContext {
    user?: {
      userId: number;
      role: string;
    };
  }
}

// ============================================
// 1. 白名单配置（仅针对 API）
// ============================================
const WHITE_LIST = [
  "/api/token",
  "/api/refresh-token",
  "/api/callback",
  "/api/public",
  "/api/qrcode/generate",
];

// 框架内部错误页面（自动放行）
const INTERNAL_ERROR_PREFIXES = ["/_nuxt_error", "/__nuxt_error"];

/**
 * 判断是否白名单路径（精确匹配或前缀匹配）
 */
function isWhitelisted(path: string): boolean {
  if (INTERNAL_ERROR_PREFIXES.some((p) => path.startsWith(p))) {
    return true;
  }
  return WHITE_LIST.some(
    (item) => path === item || path.startsWith(item + "/"),
  );
}

// ============================================
// 2. 工具函数：处理未授权请求（API 返回 401）
// ============================================
function handleUnauthorized(event: any, message?: string) {
  // 现在只会在 API 请求中调用，直接抛出 401 错误
  throw createError({
    statusCode: 401,
    message: message || "无权限访问接口，请先登录",
  });
}

// ============================================
// 3. 主中间件：只保护 API
// ============================================
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname;

  // 关键修改：只拦截 API 请求，其他请求（页面、静态资源）直接放行
  if (!pathname.startsWith("/api/")) {
    return;
  }

  // Step 1: 白名单放行（仅 API 路径）
  if (isWhitelisted(pathname)) {
    return;
  }

  // Step 2: 提取并校验 token 格式
  const authHeader = getRequestHeader(event, "authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return handleUnauthorized(event);
  }

  const token = authHeader.split(" ")[1];

  // Step 3: 验证 token 有效性
  try {
    const payload = verifyAccessToken(token as string);
    event.context.user = {
      userId: payload.userId,
      role: payload.role as string,
    };
  } catch (error) {
    // token 无效或过期
    return handleUnauthorized(event, "登录已过期，请重新登录");
  }
});
