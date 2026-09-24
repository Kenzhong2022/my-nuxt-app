// 临时调试接口：验证 NUXT_ 前缀环境变量是否正确映射到 runtimeConfig
// 只输出「是否已配置」的布尔状态，不回显任何真实值；验证完成后删除本文件
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event);
  const ok = (v: unknown) => (v ? '✅' : '❌');
  return {
    databaseUrl: ok(config.databaseUrl),
    deepseekKey: ok(config.deepseek?.apiKey),
    deepseekBase: ok(config.deepseek?.baseURL),
    jwtAccess: ok(config.jwt?.accessSecret),
    jwtRefresh: ok(config.jwt?.refreshSecret),
    cloudinaryName: ok(config.cloudinary?.cloudName),
    cloudinaryKey: ok(config.cloudinary?.apiKey),
    cloudinarySecret: ok(config.cloudinary?.apiSecret),
    cfAccountId: ok(config.cloudflare?.accountId),
    cfAiToken: ok(config.cloudflare?.workersAi?.apiToken),
    dashscopeKey: ok(config.dashscope?.apiKey),
    dashscopeBase: ok(config.dashscope?.baseUrl),
    baiduAppId: ok(config.baidu?.appId),
    baiduAppKey: ok(config.baidu?.appKey),
    upstashUrl: ok(config.upstash?.redisRestUrl),
    upstashToken: ok(config.upstash?.redisRestToken),
    qrcodeSecret: ok(config.qrcodeSecret),
    agentBaseUrl: ok(config.public?.agentBaseUrl),
    loginBase: config.public?.loginBase || '❌',
    amapKey: ok(config.public?.amapKey),
    amapSecurityCode: ok(config.public?.amapSecurityCode),
    wsUrl: config.public?.wsUrl || '❌',
  };
});
