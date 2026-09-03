import { createError, getCookie, getRequestHeader } from 'h3';
import { verifyAccessToken } from '~~/server/utils/jwt';
import { errors } from 'jose';
const { JWTExpired, JWTInvalid } = errors;
declare module 'h3' {
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
  '/api/token',
  '/api/refresh-token',
  '/api/callback',
  '/api/public',
  '/api/qrcode/generate',
  '/api/ai/v1/chat/messages',
  '/api/ai/chat',
  '/api/ai/image',
  '/api/ai/models',
];

/**
 * 判断 API 路径是否属于白名单（精确匹配或前缀匹配）
 * 前缀匹配用于 /api/public 这类需要放行子路径的场景
 */
function isWhitelisted(pathname: string): boolean {
  return WHITE_LIST.some((item) => pathname === item || pathname.startsWith(item + '/'));
}

// ============================================
// 2. 工具函数：抛出 401 未授权错误
// ============================================
function handleUnauthorized(message?: string): never {
  throw createError({
    statusCode: 401,
    message: message || '无权限访问接口，请先登录',
  });
}

// ============================================
// 3. 主中间件：仅保护 API 请求
// ============================================
export default defineEventHandler(async (event) => {
  const pathname = getRequestURL(event).pathname;

  // 非接口请求（页面、静态资源等）直接放行
  if (!pathname.startsWith('/api/')) {
    return;
  }

  // 白名单接口直接放行
  if (isWhitelisted(pathname)) {
    return;
  }

  // 提取 token：优先 Authorization 头（客户端 fetch 插件注入），其次 cookie（SSR 服务端请求）
  const authHeader = getRequestHeader(event, 'authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7) // "Bearer ".length === 7
    : getCookie(event, 'token');

  // 验证 token：try 只包 verifyAccessToken，handleUnauthorized 的 throw
  // 必须在 try 之外触发，否则 401 会被下面的 catch 捕获并包装成 500
  let payload: TokenPayload | null = null;
  try {
    payload = token ? await verifyAccessToken(token) : null;
  } catch (error) {
    // JWTExpired 是 JWTInvalid 的子类，先判过期再判无效（与原 jsonwebtoken 行为一致）
    if (error instanceof JWTExpired) {
      handleUnauthorized('token已过期，请刷新令牌或重新登录');
    }
    if (error instanceof JWTInvalid) {
      // 签名不符 / 格式错误 / 缺失等
      handleUnauthorized('token校验失败，请重新登录');
    }
    // 其他未知错误（如 token不能为空）同样按 401 处理，而非 500
    handleUnauthorized('登录已过期，请重新登录');
  }

  if (payload) {
    event.context.user = {
      userId: payload.userId,
      role: payload.role as string,
    };
  } else {
    // 无 token：在 try 之外抛 401，不会被误捕获
    handleUnauthorized('登录已过期，请重新登录');
  }
});
