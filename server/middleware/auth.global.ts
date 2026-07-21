import { sendRedirect, createError, getRequestHeader } from "h3";
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
// 1. 白名单配置（集中管理，易于增删）
// ============================================
const WHITE_LIST = [
  "/api/token",
  "/api/refresh-token",
  "/api/callback",
  "/api/public",
  "/api/qrcode/generate",
  "/login",
  "/register",
  "/CallBack",
  "/qrcode",
  "/agent",
  "/testdynamicForm",
  "/Survey",
  "/",
];

// 框架内部错误页面（自动放行）
const INTERNAL_ERROR_PREFIXES = ["/_nuxt_error", "/__nuxt_error"];

const LOGIN_URL = process.env.LOGIN_URL || "http://localhost:3001/login";
// const LOGIN_URL = "http://localhost:3001/Login"; // 本地登录页

/**
 * 判断是否白名单路径
 * - 精确匹配或前缀匹配（避免 /qrcode 和 /qrcode/xxx 分开写）
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
// 2. 工具函数：统一处理无 token / token 过期
// ============================================
function handleUnauthorized(event: any, redirectPath?: string) {
  const isApi = event.path.startsWith("/api/");
  if (isApi) {
    throw createError({
      statusCode: 401,
      message: redirectPath || "无权限访问接口，请先登录",
    });
  }
  const loginUrl = `${LOGIN_URL}?redirect=${encodeURIComponent(event.path)}`;
  // sendRedirect 内部会 throw，但为了类型安全，显式 return
  return sendRedirect(event, loginUrl, 302); // 重定向到登录页
}

// ============================================
// 3. 主中间件（清晰的三步走）
// ============================================
export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const pathname = url.pathname; // 例如：/callback
  console.log(pathname);
  // Step 1: 白名单放行
  if (isWhitelisted(pathname)) {
    return;
  }

  // Step 2: 提取并校验 token 格式
  const authHeader = getRequestHeader(event, "authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return await handleUnauthorized(event);
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
    return await handleUnauthorized(event, "登录已过期，请重新登录");
  }
});
