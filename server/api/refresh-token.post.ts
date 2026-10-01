// POST /api/refresh-token —— 用 refresh_token cookie 向认证中心轮换续期
// 认证中心 /api/auth/refresh 校验通过后会撤销旧 refresh_token 并签发新的一对令牌，
// 本端点将新令牌重写进 HttpOnly cookie；失败则清空会话 cookie 并 401
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const refreshToken = getCookie(event, 'refresh_token');

  if (!refreshToken) {
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' });
  }

  try {
    type TokenInfo = {
      access_token: string;
      refresh_token: string;
      expires_in: number;
    };
    const tokenInfo = await $fetch<TokenInfo>(config.public.loginBase + '/api/auth/refresh', {
      method: 'POST',
      body: {
        refresh_token: refreshToken,
        client_id: config.public.clientId,
      },
    });

    // 轮换重写双 cookie（与 /api/token 写入规则一致）
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
    setCookie(event, 'token', tokenInfo.access_token, {
      ...cookieOptions,
      maxAge: tokenInfo.expires_in,
    });
    setCookie(event, 'refresh_token', tokenInfo.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 3600,
    });

    return { code: 200, msg: '刷新成功' };
  } catch {
    // refresh_token 无效/过期/已被轮换消费：清空会话，要求重新登录
    deleteCookie(event, 'token', { path: '/' });
    deleteCookie(event, 'refresh_token', { path: '/' });
    throw createError({ statusCode: 401, message: '登录已过期，请重新登录' });
  }
});
