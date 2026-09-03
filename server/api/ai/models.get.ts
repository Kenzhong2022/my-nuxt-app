// server/api/ai/models.get.ts - 代理 Cloudflare Workers AI 模型列表（按名称匹配真实调用 ID）
// 目录 json 的 author 是展示名（如 "DeepSeek"），拼不出真实命名空间（@cf/deepseek-ai/...），
// 此接口提供 CF 官方模型 ID 列表，前端按模型名（ID 尾段）精确匹配

/** 进程内缓存（模型列表低频变化，1 小时刷新） */
let cache: { data: { id: string }[]; ts: number } | null = null
const TTL = 60 * 60 * 1000

export default defineEventHandler(async () => {
  if (cache && Date.now() - cache.ts < TTL) return cache.data

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

  // 分页拉取全部模型（per_page 上限 100）
  // 注意：CF 返回项的 id 是内部 UUID，调用 ID 在 name 字段（如 "@cf/meta/llama-3.2-3b-instruct"）
  const models: { id: string }[] = []
  let page = 1
  try {
    while (true) {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/models/search?page=${page}&per_page=100`,
        { headers: { Authorization: `Bearer ${apiToken}` } },
      )
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${(await res.text()).slice(0, 200)}`)
      }
      const json: any = await res.json()
      const list: any[] = json?.result ?? []
      models.push(...list.map((m: any) => ({ id: m.name as string })))
      if (list.length < 100) break
      page++
    }
  } catch (err) {
    // 拉取失败时若有旧缓存继续使用，否则抛错
    if (cache) return cache.data
    throw createError({
      statusCode: 502,
      statusMessage: `Workers AI 模型列表获取失败: ${err instanceof Error ? err.message : err}`,
    })
  }

  cache = { data: models, ts: Date.now() }
  return models
})
