// server/api/ai/chat.post.ts - Cloudflare Workers AI 聊天（REST API + 流式输出，支持图片多模态）
export default defineEventHandler(async (event) => {
  const { messages, model } = await readBody(event)

  // 校验：content 为纯文本，或 OpenAI 风格内容数组（text / image_url 混合多模态）
  const isPart = (p: any) =>
    (p?.type === "text" && typeof p.text === "string") ||
    (p?.type === "image_url" && typeof p.image_url?.url === "string")
  if (
    !messages ||
    !Array.isArray(messages) ||
    !messages.every(
      (m: any) =>
        m &&
        typeof m.role === "string" &&
        (typeof m.content === "string" ||
          (Array.isArray(m.content) && m.content.every(isPart))),
    )
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "messages 参数必须是数组，content 为文本或多模态分片",
    })
  }

  // 是否携带图片（存在 image_url 内容分片）
  const hasImage = messages.some(
    (m: any) => Array.isArray(m.content) && m.content.some((p: any) => p?.type === "image_url"),
  )

  // 前端可选下发模型 ID（@cf/{厂商slug}/{名称}），严格校验格式防注入，非法回退默认模型；
  // 携带图片时默认模型必须支持视觉输入，否则回退视觉模型
  const MODEL_RE = /^@cf\/[a-z0-9][a-z0-9._-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/
  const modelId =
    typeof model === "string" && MODEL_RE.test(model)
      ? model
      : hasImage
        ? "@cf/meta/llama-3.2-11b-vision-instruct"
        : "@cf/meta/llama-3.2-3b-instruct"

  const { cloudflare } = useRuntimeConfig()
  const { accountId, workersAi } = cloudflare
  const { apiToken } = workersAi || {}
  if (!accountId || !apiToken) {
    throw createError({
      statusCode: 500,
      statusMessage:
        "Workers AI 未配置：请在 .env 填写 NUXT_CLOUDFLARE_ACCOUNT_ID / NUXT_CLOUDFLARE_WORKERS_AI_API_TOKEN",
    })
  }

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${modelId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, stream: true }),
    },
  )

  if (!res.ok || !res.body) {
    throw createError({
      statusCode: 502,
      statusMessage: `Workers AI 请求失败: ${res.status} ${(await res.text()).slice(0, 200)}`,
    })
  }

  // 部分模型（如 llava）不支持流式，stream:true 仍返回整体 JSON：
  // 统一转成单条 SSE data 事件，前端解析逻辑保持一致
  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json: any = await res.json().catch(() => null)
    const response = json?.response ?? json?.result?.response
    if (typeof response !== "string") {
      throw createError({
        statusCode: 502,
        statusMessage: `Workers AI 响应格式异常: ${JSON.stringify(json)?.slice(0, 200)}`,
      })
    }
    setResponseHeader(event, "content-type", "text/event-stream")
    return sendStream(event, new Response(`data: ${JSON.stringify({ response })}\n\n`).body!)
  }

  // SSE 原样透传给客户端（打字机效果由前端解析 data: {"response": "..."} 实现）
  return sendStream(event, res.body)
})
