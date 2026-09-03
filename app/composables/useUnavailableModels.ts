/**
 * 当前 CF 账号不可用的模型名单（服务端 chat 403 自动登记，见 /api/ai/unavailable-models）
 * 模块级共享状态：多个选择器组件共用一次请求
 */
export function useUnavailableModels() {
  // 目录模型名集合（ID 尾段，与 llm-modules.json 的 name 一致）
  const names = useState<Set<string>>("unavailable-model-names", () => new Set())
  const loaded = useState("unavailable-models-loaded", () => false)

  /** 拉取名单（幂等，应用生命周期内仅请求一次；失败允许重试） */
  async function load() {
    if (loaded.value) return
    loaded.value = true
    try {
      const rows = await $fetch<{ modelId: string; modelName: string; reason: string }[]>(
        "/api/ai/unavailable-models",
      )
      names.value = new Set(rows.map((r) => r.modelName))
    } catch {
      loaded.value = false // 拉取失败不摘除任何模型，下次挂载重试
    }
  }

  return { names, load }
}
