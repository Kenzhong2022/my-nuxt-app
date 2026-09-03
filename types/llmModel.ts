/**
 * ============================================================
 * Workers AI 模型目录类型定义
 * ============================================================
 *
 * 数据来源：Cloudflare Workers AI 模型目录
 * https://developers.cloudflare.com/workers-ai/models/
 * 本地快照见 llm_modules.md（86 个模型）
 */

/**
 * 任务类型（模型按用途的分类）
 * 取值为目录页 Task Types 筛选项的原始标签
 */
export enum LlmTaskType {
  /** 文本生成（对话/补全，目录中数量最多的类别） */
  TEXT_GENERATION = 'Text Generation',
  /** 文本转语音 TTS */
  TEXT_TO_SPEECH = 'Text-to-Speech',
  /** 文本嵌入（向量化，用于检索/相似度） */
  TEXT_EMBEDDINGS = 'Text Embeddings',
  /** 文本分类（情感分析/重排序） */
  TEXT_CLASSIFICATION = 'Text Classification',
  /** 文本摘要 */
  SUMMARIZATION = 'Summarization',
  /** 机器翻译 */
  TRANSLATION = 'Translation',
  /** 语音识别 ASR（语音转文本） */
  SPEECH_RECOGNITION = 'Automatic Speech Recognition',
  /** 文生图 */
  TEXT_TO_IMAGE = 'Text-to-Image',
  /** 图像理解（图像描述/视觉问答） */
  IMAGE_TO_TEXT = 'Image-to-Text',
  /** 图文混合输入 → 文本（多模态对话） */
  IMAGE_TEXT_TO_TEXT = 'Image-Text-to-Text',
  /** 图像分类 */
  IMAGE_CLASSIFICATION = 'Image Classification',
  /** 目标检测 */
  OBJECT_DETECTION = 'Object Detection',
  /** 语音活动检测（判断说话起止，语音智能体用） */
  VOICE_ACTIVITY_DETECTION = 'Voice Activity Detection',
}

/**
 * 模型徽标（目录页卡片上的标签，可叠加多个）
 * 生命周期与能力类标签统一放这里，避免字段爆炸
 */
export type LlmModelBadge =
  /** 公测阶段，不建议生产使用 */
  | 'beta'
  /** Cloudflare 自托管（区别于 Partner 第三方托管） */
  | 'cloudflareHosted'
  /** 支持批量推理接口（非实时） */
  | 'batch'
  /** 支持实时流式调用 */
  | 'realtime'
  /** 第三方厂商托管，调用计费规则不同 */
  | 'partner'
  /** 已弃用，仅存量兼容 */
  | 'deprecated'
  /** 支持加载 LoRA 适配器 */
  | 'lora'
  /** 支持函数调用 / 工具调用 */
  | 'functionCalling'
  /** 推理型模型（思维链） */
  | 'reasoning'
  /** 支持图像输入（多模态） */
  | 'vision';

/** 单个模型条目（对应目录页一张模型卡片） */
export interface LlmModel {
  /** 模型标识，同时是 URL 末段，如 "flux-2-dev" */
  readonly name: string;
  /** 厂商，如 "Black Forest Labs" / "Meta" / "DeepSeek" */
  readonly author: string;
  /** 任务类型 */
  readonly taskType: LlmTaskType;
  /** 模型简介 */
  readonly description: string;
  /** 文档页地址，如 https://developers.cloudflare.com/workers-ai/models/flux-2-dev/ */
  readonly url: string;
  /** 厂商 logo 地址（部分模型无，如 dreamshaper-8-lcm） */
  readonly logo?: string | null;
  /** 徽标集合（beta/deprecated/realtime 等） */
  readonly badges: readonly LlmModelBadge[];
  /**
   * 完整调用 ID，Workers AI REST API 用，
   * 如 "@cf/black-forest-labs/flux-2-dev"（目录页未直接给出，需按规则拼接或查详情页）
   */
  readonly modelId?: string;
}

/** 按任务类型分组的模型集合（树形一层） */
export interface LlmModelTaskGroup {
  /** 本组任务类型 */
  readonly taskType: LlmTaskType;
  /** 该类型下的模型列表 */
  readonly models: readonly LlmModel[];
}

/** 模型目录（目录页整体快照，树形：taskTypes → models） */
export interface LlmModelCatalog {
  /** 目录页地址 */
  readonly source: string;
  /** 目录最后更新日期，如 "2026-08-12" */
  readonly lastUpdated: string;
  /** 模型总数（快照时为 86，等于各组 models 数量之和） */
  readonly total: number;
  /** 任务类型分组（models 在每个分组内，顶层没有平铺数组） */
  readonly taskTypes: readonly LlmModelTaskGroup[];
}
