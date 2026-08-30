// server/api/ai.post.ts - Cloudflare Workers AI 聊天（REST API + 流式输出）
export default defineEventHandler(async (event) => {
  const { messages } = await readBody(event)

  if (!messages || !Array.isArray(messages)) {
    throw createError({
      statusCode: 400,
      statusMessage: "messages 参数必须是数组",
    })
  }

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
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.2-3b-instruct`,
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

  // 原样透传 SSE 流给客户端（打字机效果由前端解析 data: {"response": "..."} 实现）
  return sendStream(event, res.body)
})
