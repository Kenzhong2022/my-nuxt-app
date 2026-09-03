// server/api/ai/chat.post.ts - Cloudflare Workers AI 聊天
// 官方推荐链路：Vercel AI SDK（ai 包）+ workers-ai-provider（REST 模式，无需 Workers 运行时 binding，
// 本地 nuxt dev（Node）与生产（CF Pages）同一套代码），支持图片多模态与推理模型（reasoning 分离）
import { createWorkersAI } from "workers-ai-provider"
import { createUIMessageStreamResponse, streamText, toUIMessageStream, type ModelMessage } from "ai"

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

  // OpenAI 风格分片 → AI SDK 消息（image_url → image，AI SDK 的 image 接受 base64 data URL）
  const mapped: ModelMessage[] = messages.map((m: any) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content.map((p: any) =>
            p.type === "image_url"
              ? { type: "image" as const, image: p.image_url.url }
              : { type: "text" as const, text: p.text },
          ),
  }))

  // REST 模式创建 provider（也可换 binding 模式：createWorkersAI({ binding: env.AI })）
  const workersai = createWorkersAI({ accountId, apiKey: apiToken })

  const result = streamText({
    model: workersai(modelId),
    messages: mapped,
  })
  // UI 消息流（SSE）：输出结构化分片（text-delta 正文 / reasoning-delta 思维链 / error），
  // 前端按 type 分流；模型差异（llava 整体 JSON、GLM 的 reasoning_content）由 provider 归一化
  // ai@7：实例方法 toUIMessageStreamResponse 已废弃，改用独立辅助函数 + result.stream
  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  })
})
