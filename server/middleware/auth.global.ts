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
// 注意：非 API 请求（页面、静态资源）在主中间件中已直接放行，无需配置在此
// ============================================
const WHITE_LIST = [
  "/api/token",
  "/api/refresh-token",
  "/api/callback",
  "/api/public",
  "/api/qrcode/generate",
  "/api/ai/v1/chat/messages",
];

/**
 * 判断 API 路径是否属于白名单（精确匹配或前缀匹配）
 * 前缀匹配用于 /api/public 这类需要放行子路径的场景
 */
function isWhitelisted(pathname: string): boolean {
  return WHITE_LIST.some(
    (item) => pathname === item || pathname.startsWith(item + "/"),
  );
}

// ============================================
// 2. 工具函数：抛出 401 未授权错误
// ============================================
function handleUnauthorized(message?: string): never {
  throw createError({
    statusCode: 401,
    message: message || "无权限访问接口，请先登录",
  });
}

// ============================================
// 3. 主中间件：仅保护 API 请求
// ============================================
export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;

  // 非接口请求（页面、静态资源等）直接放行
  if (!pathname.startsWith("/api/")) {
    return;
  }

  // 白名单接口直接放行
  if (isWhitelisted(pathname)) {
    return;
  }

  // 校验 Authorization 头格式
  const authHeader = getRequestHeader(event, "authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return handleUnauthorized();
  }

  // 提取并验证 token
  const token = authHeader.slice(7); // "Bearer ".length === 7
  try {
    const payload = verifyAccessToken(token);
    event.context.user = {
      userId: payload.userId,
      role: payload.role as string,
    };
  } catch {
    return handleUnauthorized("登录已过期，请重新登录");
  }
});
