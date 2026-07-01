export default defineNitroPlugin(async () => {
  // 如果 redis 未初始化（环境变量缺失），跳过
  if (!redis) {
    console.warn("[Redis Plugin] Redis 客户端未初始化，跳过连接测试");
    return;
  }

  const MAX_RETRIES = 5;
  let connected = false;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const pong = await redis.ping();

      if (pong === "PONG") {
        console.log(`✅ [Redis] 连接成功！Upstash Redis 已就绪 (尝试 ${attempt}/${MAX_RETRIES})`);
        connected = true;
        break;
      } else {
        console.error(`❌ [Redis] 连接异常，响应: ${pong} (尝试 ${attempt}/${MAX_RETRIES})`);
      }
    } catch (error) {
      console.error(`❌ [Redis] 连接失败: ${error} (尝试 ${attempt}/${MAX_RETRIES})`);
    }

    // 如果不是最后一次，等待后重试
    if (attempt < MAX_RETRIES) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  if (!connected) {
    console.error(`❌ [Redis] 连续 ${MAX_RETRIES} 次连接失败，请检查 Redis 配置`);
  }
});
