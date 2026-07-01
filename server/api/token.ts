// server/api/token.post.js
export default defineEventHandler(async (event) => {
  // 读取前端 POST 传过来的 code
  const body = await readBody(event);
  const { code, client_id, redirect_uri } = body;

  try {
    // 请求认证中心 localhost:3001 兑换令牌
    const tokenInfo = await $fetch("http://localhost:3001/api/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded", // 表单数据编码格式
      },
      body: {
        grant_type: "authorization_code",
        client_id,
        client_secret: "xxx-secret-key",
        code,
        redirect_uri,
      },
    });

    return tokenInfo;
  } catch (err) {
    // 捕获错误，返回友好提示
    throw createError({
      statusCode: 400,
      statusMessage: "换取Token失败",
    });
  }
});
