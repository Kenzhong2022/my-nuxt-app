// utils/whitelist.ts
export const PUBLIC_PATHS = [
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
  "/dashboard",
];

// 框架内部错误页面
export const INTERNAL_ERROR_PREFIXES = ["/_nuxt_error", "/__nuxt_error"];

/**
 * 判断路径是否属于白名单（精确匹配或前缀匹配）
 */
export function isPublicPath(path: string): boolean {
  if (INTERNAL_ERROR_PREFIXES.some((p) => path.startsWith(p))) {
    return true;
  }
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
}
