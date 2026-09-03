// server/api/ai/image.post.ts - Cloudflare Workers AI 文生图
export default defineEventHandler(async (event) => {
  const { prompt, steps, model } = await readBody(event);

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'prompt 参数必须是非空字符串',
    });
  }

  // 前端可选下发模型 ID（@cf/{厂商slug}/{名称}），严格校验格式防注入，非法回退默认模型
  const MODEL_RE = /^@cf\/[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
  const modelId =
    typeof model === 'string' && MODEL_RE.test(model)
      ? model
      : '@cf/black-forest-labs/flux-1-schnell';

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
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        // steps 是 flux-1-schnell 专属参数（1-8 步），其他模型传了会 400，仅默认模型下发
        ...(modelId === '@cf/black-forest-labs/flux-1-schnell'
          ? { steps: Math.min(Math.max(Number(steps) || 4, 1), 8) }
          : {}),
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

  // 成功时 Cloudflare 可能返回两种格式：
  // 1. flux-1-schnell：JSON {"result":{"image":"<base64>"}}（REST API 包装）
  // 2. 其他图像模型（SDXL 等）：PNG 二进制（开头为 PNG 魔术字节 89 50 4E 47）
  const arrayBuf = await res.arrayBuffer();

  const buf = Buffer.from(arrayBuf);
  let base64: string;

  if (buf.subarray(0, 4).toString('hex') === '89504e47') {
    // 二进制 PNG → 转 base64
    base64 = buf.toString('base64');
  } else {
    // JSON 响应 → 解析出 result.image（本身就是 base64）
    const json = JSON.parse(buf.toString('utf8'));
    if (json?.errors?.length) {
      throw createError({
        statusCode: 502,
        statusMessage: `Workers AI 业务错误: ${JSON.stringify(json.errors).slice(0, 200)}`,
      });
    }
    base64 = json?.result?.image ?? json?.image;
    if (!base64) {
      throw createError({
        statusCode: 502,
        statusMessage: `Workers AI 响应中没有图片数据: ${buf.toString('utf8').slice(0, 200)}`,
      });
    }
  }

  return { image: `data:image/png;base64,${base64}` };
});
