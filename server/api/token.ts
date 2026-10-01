// POST /api/token —— OAuth2 授权码换 token（服务端中转，client_secret 不出服务端）
// 换取成功后由本服务直接写 HttpOnly cookie（access + refresh），令牌不进响应体，
// 前端 JS 不可读，防 XSS 窃取；登录态翻转节点 = 本响应的 Set-Cookie 时刻
export default defineEventHandler(async (event) => {
  // 登录服务地址来自 runtimeConfig.public.loginBase（环境变量 NUXT_PUBLIC_LOGIN_BASE 运行时注入）
  const config = useRuntimeConfig(event);
  const { clientSecret } = config;
  const { loginBase, clientId } = config.public;
  // 读取前端 POST 传过来的 code（client_id 以服务端配置为准，不信请求体）
  const body = await readBody(event);
  const { code, redirect_uri } = body;

  type TokenInfo = {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    id_token: { userId: string; role: string };
  };
  try {
    // 请求认证中心兑换令牌
    const tokenInfo = await $fetch<TokenInfo>(loginBase + '/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // 表单数据编码格式
      },
      body: {
        /** 授权码模式，固定值为 authorization_code  */
        grant_type: 'authorization_code',
        /** 客户端ID */
        client_id: clientId,
        /** 客户端密钥 */
        client_secret: clientSecret,
        /** 授权码 */
        code,
        /** 重定向URI */
        redirect_uri,
      },
    });

    // 会话 cookie：HttpOnly + Secure(生产) + SameSite=Lax，浏览器自动携带，JS 不可读写
    const isProd = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
    };
    // access token：有效期对齐认证中心 expires_in（当前 2h）
    setCookie(event, 'token', tokenInfo.access_token, {
      ...cookieOptions,
      maxAge: tokenInfo.expires_in,
    });
    // refresh token：对齐认证中心 7 天有效期（轮换续期由 /api/refresh-token 处理）
    setCookie(event, 'refresh_token', tokenInfo.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 3600,
    });

    // 响应体不含任何令牌，前端仅凭 code === 200 判定会话已建立
    return { code: 200, msg: '登录成功' };
  } catch (err) {
    // 打印认证中心真实失败原因（invalid_code = 授权码过期/已被消费；body 不匹配 = client/redirect 不符）
    console.error('[token] 认证中心换码失败:', (err as { data?: unknown })?.data ?? (err as Error)?.message ?? err);
    // 捕获错误，返回友好提示
    throw createError({
      statusCode: 400,
      message: '换取Token失败',
    });
  }
});
