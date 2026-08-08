// utils/whitelist.ts
// 前端页面白名单（仅针对页面路由，API 鉴权由 server/middleware/auth.global.ts 处理）
export const PUBLIC_PATHS = [
  "/403", // 无权限错误页
  "/CallBack", // OAuth 登录回调入口
  "/qrcode", // 二维码生成页
  "/store", // 商品列表首页（注意：/store/cart、/store/chat 仍需登录，故仅精确匹配）
];

// 框架内部错误页面（前缀匹配）
export const INTERNAL_ERROR_PREFIXES = ["/_nuxt_error", "/__nuxt_error"];

/**
 * 判断页面路径是否属于前端白名单（精确匹配）
 * 注意：仅用于前端路由中间件，API 鉴权请走服务端中间件
 */
export function isPublicPath(path: string): boolean {
  if (INTERNAL_ERROR_PREFIXES.some((p) => path.startsWith(p))) {
    return true;
  }
  console.log(path, path === "/Callback");
  return PUBLIC_PATHS.includes(path);
}
