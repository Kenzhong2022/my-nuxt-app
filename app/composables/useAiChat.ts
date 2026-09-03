import type { Ref } from "vue";
// 模型目录反查 / Workers AI ID 拼装复用纯对话页的常量
import { CHAT_TASKS, isDeprecatedModel, toModelId } from "~/pages/llmModels/constants/chat";
import type { LlmModel, LlmModelCatalog } from "~~/types/llmModel";
import type { TextContent, ImageUrlContent } from "~~/types/agent";
// SSE 规范级解析（AI SDK 同源依赖）：处理 data: 无空格 / CRLF / 多行 data / 事件字段等边角
import { createParser } from "eventsource-parser";

/** 多模态内容分片（文本 / 图片，OpenAI 风格，对应 LangChain 的 MessageContentComplex） */
export type MessageContentComplex = TextContent | ImageUrlContent;

// ===================== LangChain 风格消息类（模仿 @langchain/core/messages） =====================
// SystemMessage / HumanMessage / AIMessage 三角色基类结构，
// 图文混合用 HumanMessageMultimodal 构造，序列化时映射为服务端的 OpenAI 风格 role

/** 消息角色标识（对应 LangChain 的 getType()） */
type MessageType = "system" | "human" | "ai";

/** 消息基类：content 支持纯文本或多模态分片 */
class BaseMessage {


  /**
   * @description 构造函数
   * @param content 消息内容（纯文本或多模态分片）
   * @param role 消息角色（system / human / ai）
   */
  constructor(
    readonly content: string | MessageContentComplex[],
    readonly role: MessageType,
  ) {}

  /** JSON.stringify 时自动调用：映射为 /api/ai/chat 请求体中的消息结构 */
  toJSON(): { role: "system" | "user" | "assistant"; content: string | MessageContentComplex[] } {
    const role = this.role === "human" ? "user" : this.role === "ai" ? "assistant" : "system";
    return { role, content: this.content };
  }
}

class SystemMessage extends BaseMessage {
  constructor(content: string) {
    super(content, "system");
  }
}

class HumanMessage extends BaseMessage {
  constructor(content: string | MessageContentComplex[]) {
    super(content, "human");
  }
}

class AIMessage extends BaseMessage {
  constructor(content: string) {
    super(content, "ai");
  }
}

/** 图文混合用户消息：文本分片在前，图片（base64 data URL）在后 */
class HumanMessageMultimodal extends HumanMessage {
  constructor(text: string, image: string) {
    super([
      { type: "text", text },
      { type: "image_url", image_url: { url: image } },
    ]);
  }
}

export { SystemMessage, HumanMessage, AIMessage, HumanMessageMultimodal };
/** 消息实例类型（调用方维护历史列表用） */
export type BaseMessageLike = InstanceType<typeof BaseMessage>;

/**
 * Workers AI 对话组合式函数
 * 封装 POST /api/ai/chat（Cloudflare Workers AI 流式）的调用与 SSE 解析，
 * 以及模型目录加载、按模型名反查调用 ID 的能力
 *
 * @returns output 流式回复文本 / loading 是否请求中 / 模型反查与发送方法
 */
export function useAiChat() {
  /** 流式回复文本（逐块累加） */
  const output = ref("");
  /** 思维链文本（推理模型 delta.reasoning 累加，普通模型为空） */
  const reasoning = ref("");
  /** 是否请求中（含流式接收阶段） */
  const loading = ref(false);

  /** 模型目录（仅用于反查所选模型的厂商与名称） */
  const catalog = ref<LlmModelCatalog | null>(null);

  /** CF 官方模型 ID 列表（@cf/{org}/{name}，org 为 HF 组织名，无法从目录 author 拼出） */
  const cfModels = ref<{ id: string }[] | null>(null);
  // 服务端登记的不可用模型名单（403 自动入库，共享状态不重复请求）
  const { names: unavailableNames, load: loadUnavailable } = useUnavailableModels();

  onMounted(async () => {
    catalog.value = await $fetch<LlmModelCatalog>("/allModels/llm-modules.json");
    // 列表失败不阻断对话（resolveChatModelId 兜底走 slug 拼接 / API 默认模型）
    cfModels.value = await $fetch<{ id: string }[]>("/api/ai/models").catch(() => null);
    loadUnavailable();
  });

  /** 按模型名反查目录中的模型 */
  function findModel(modelName: string): LlmModel | null {
    return (
      catalog.value?.taskTypes.flatMap((g) => g.models).find((m) => m.name === modelName) ?? null
    );
  }

  /**
   * 模型名 → Workers AI 真实调用 ID
   * 优先从 CF 官方模型列表按 ID 尾段精确匹配（目录 name 即 slug）；
   * 列表不可用时退回 author slug 拼接（meta/google 等多数厂商恰好成立）；
   * 选中模型非对话类时返回 undefined 走 API 默认模型
   */
  function resolveChatModelId(modelName: string): string | undefined {
    const selected = findModel(modelName);
    if (!selected || !CHAT_TASKS.includes(selected.taskType)) return undefined;
    // 已弃用 / 不可用名单（403）中的模型回退 API 默认模型
    if (isDeprecatedModel(selected) || unavailableNames.value.has(modelName)) return undefined;
    return cfModels.value?.find((m) => m.id.endsWith(`/${modelName}`))?.id
      ?? toModelId(selected.author, selected.name);
  }

  /**
   * 流式发送对话（单次请求，messages 由调用方用 LangChain 风格消息类构造）
   * 流式必须用原生 fetch（$fetch/useFetch 会等整个响应结束）
   *
   * @param messages 消息列表（toJSON 自动序列化为服务端格式）
   * @param model 可选模型 ID，缺省走 API 默认模型（带图时自动回退视觉模型）
   * @throws 网络或 HTTP 错误（loading 已复位，output 保留已收到的部分）
   */
  async function sendChat(messages: BaseMessage[], model?: string): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    output.value = "";
    reasoning.value = "";

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, model }),
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${detail.slice(0, 120)}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      // eventsource-parser：feed 任意大小的 chunk，凑成完整事件后回调 onEvent
      // （跨 chunk 半包、CRLF 换行、data: 无空格等规范边角均由其处理）
      const parser = createParser({
        onEvent(event) {
          let json: any;
          try {
            json = JSON.parse(event.data);
          } catch {
            console.warn("[ai-chat] 无法解析的 SSE data:", event.data);
            return; // 忽略无法解析的脏数据
          }
          // AI SDK UI 消息流协议：按 type 分流（模型差异已由服务端 provider 归一化）
          // text-delta 正文 / reasoning-delta 思维链 / error 服务端透传的错误
          if (json.type === "text-delta" && typeof json.delta === "string") {
            output.value += json.delta;
          } else if (json.type === "reasoning-delta" && typeof json.delta === "string") {
            reasoning.value += json.delta;
          } else if (json.type === "error") {
            throw new Error(json.errorText || "模型返回错误");
          }
        },
      });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        parser.feed(decoder.decode(value, { stream: true }));
      }
    } finally {
      loading.value = false;
    }
  }

  return {
    output: output as Ref<string>,
    reasoning: reasoning as Ref<string>,
    loading: loading as Ref<boolean>,
    catalog,
    findModel,
    resolveChatModelId,
    sendChat,
  };
}
