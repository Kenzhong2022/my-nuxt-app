// server/api/token.post.js
export default defineEventHandler(async (event) => {
  // 登录服务地址来自 runtimeConfig.public.loginBase（环境变量 NUXT_PUBLIC_LOGIN_BASE 运行时注入）
  const { loginBase } = useRuntimeConfig(event).public;
  // 读取前端 POST 传过来的 code
  const body = await readBody(event);
  const { code, client_id, redirect_uri } = body;

  type TokenInfo = {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    id_token: { userId: string; role: string };
  };
  try {
    // 请求线上认证中心兑换令牌
    const tokenInfo = await $fetch(loginBase + '/api/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded', // 表单数据编码格式
      },
      body: {
        /** 授权码模式，固定值为 authorization_code  */
        grant_type: 'authorization_code',
        /** 客户端ID */
        client_id,
        /** 客户端密钥 */
        client_secret: 'xxx-secret-key',
        /** 授权码 */
        code,
        /** 重定向URI */
        redirect_uri,
      },
    });
    console.log('tokenInfo role:', (tokenInfo as TokenInfo).id_token.role); // id_token 为明文对象，直接读取角色

    return tokenInfo;
  } catch (err) {
    // 捕获错误，返回友好提示
    throw createError({
      statusCode: 400,
      statusMessage: '换取Token失败',
    });
  }
});
