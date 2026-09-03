// server/api/ai/unavailable-models.get.ts - 当前 CF 账号不可用的模型名单
// 数据来源：chat.post.ts 流式错误捕获（403 自动入库）+ 人工预置；
// 前端模型选择器拉取此名单后摘除对应模型，避免用户选到必然失败的模型

export interface UnavailableModel {
  /** 完整调用 ID（@cf/{org}/{name}） */
  modelId: string
  /** 目录模型名（ID 尾段，与 llm-modules.json 的 name 一致） */
  modelName: string
  reason: string
}

/** 进程内缓存（名单低频变化，10 分钟刷新） */
let cache: { data: UnavailableModel[]; ts: number } | null = null
const TTL = 10 * 60 * 1000

export default defineEventHandler(async (): Promise<UnavailableModel[]> => {
  if (cache && Date.now() - cache.ts < TTL) return cache.data

  const { sql } = setupDatabase()
  try {
    const rows = await sql`
      SELECT model_id AS "modelId", model_name AS "modelName", reason
      FROM unavailable_models
      ORDER BY created_at DESC
    `
    cache = { data: rows as UnavailableModel[], ts: Date.now() }
    return cache.data
  } catch (err) {
    // 名单属增强过滤，查询失败不阻断页面（返回空名单 + 控制台留痕）
    console.error("[ai/unavailable-models] 查询失败:", err)
    return []
  }
})
