import { createError, getCookie, getRequestHeader, type H3Event } from 'h3';
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
  '/api/ai/unavailable-models',
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

/**
 * 设计上就无 token 的端点（令牌兑换/刷新/回调）：调用时客户端尚未持有 token，
 * 尽力鉴权分支不对它们打游客诊断日志，避免误导排查
 */
const NO_TOKEN_DIAG = ['/api/token', '/api/refresh-token', '/api/callback'];

/**
 * 提取 token：优先 Authorization 头（客户端 fetch 插件注入），其次 cookie（SSR 服务端请求）
 */
function extractToken(event: H3Event): string | undefined {
  const authHeader = getRequestHeader(event, 'authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : getCookie(event, 'token');
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

  // 白名单接口直接放行（不强制登录）
  if (isWhitelisted(pathname)) {
    // 可选鉴权：尽力解析 token 注入 context.user，供需要区分登录态的公共接口使用；
    // 无 token / 解析失败均静默跳过（不拦截、不抛 401），由接口自行决定匿名行为
    const publicToken = extractToken(event);
    // 令牌兑换等设计上无 token 的端点不打诊断日志
    const diagEnabled = !NO_TOKEN_DIAG.some((item) => pathname === item || pathname.startsWith(item + '/'));
    if (!publicToken) {
      // 诊断：无 Authorization 头且无 cookie token → 按游客
      if (diagEnabled) {
        // console.warn(`[auth] ${pathname}：未携带 token（无 Bearer 头、无 cookie token）→ 游客`);
      }
    } else {
      try {
        const payload = await verifyAccessToken(publicToken);
        event.context.user = {
          userId: payload.userId,
          role: payload.role as string,
        };
      } catch (error) {
        // 公共接口匿名可用，token 无效视为游客
        // 诊断：区分过期 / 验签失败（密钥不符、格式错误）
        if (diagEnabled) {
          console.warn(`[auth] ${pathname}：token 校验失败 → 游客：`, (error as Error)?.message);
        }
      }
    }
    return;
  }

  // 提取 token 并验证
  const token = extractToken(event);

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
