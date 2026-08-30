// server/api/ai/image.post.ts - Cloudflare Workers AI 文生图（flux-1-schnell）
export default defineEventHandler(async (event) => {
  const { prompt, steps } = await readBody(event);

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'prompt 参数必须是非空字符串',
    });
  }

  const { cloudflare } = useRuntimeConfig();
  const { accountId, workersAi } = cloudflare;
  const { apiToken } = workersAi || {};
  if (!accountId || !apiToken) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Workers AI 未配置：请在 .env 填写 NUXT_CLOUDFLARE_ACCOUNT_ID / NUXT_CLOUDFLARE_WORKERS_AI_API_TOKEN',
    });
  }

  // flux-1-schnell 只懂英文描述，中文 prompt 会生成无意义纹理
  // 自动中译英（不含中文则原样返回；翻译失败降级用原文，不阻断）
  const finalPrompt = await translateToEnglish(prompt.trim());
  if (finalPrompt !== prompt.trim()) {
    console.log(`[ai/image] prompt 已翻译: "${prompt.trim()}" -> "${finalPrompt}"`);
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        // flux-1-schnell 默认 4 步（1-8 可选），步数越多越慢、细节略增
        steps: Math.min(Math.max(Number(steps) || 4, 1), 8),
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text();
    console.error('[ai/image] 生图失败:', res.status, errText.slice(0, 500));
    throw createError({
      statusCode: 502,
      statusMessage: `Workers AI 生图失败: ${res.status} ${errText.slice(0, 200)}`,
    });
  }

  // 成功时 Cloudflare 直接返回 PNG 二进制
  const imageBuffer = await res.arrayBuffer();
  console.log(
    `[ai/image] 生图成功: prompt="${prompt.trim()}" steps=${steps} 返回 ${imageBuffer.byteLength} 字节, Content-Type=${res.headers.get('content-type')}`,
  );

  // 转为 data URL（base64）返回，前端可直接塞进 <img src>
  // Buffer.toString('base64') 分块处理，无展开运算符栈溢出风险
  const base64 = `data:image/png;base64,${Buffer.from(imageBuffer).toString('base64')}`;
  return { image: base64 };
});
