// app/pages/llmModels/constants/chat.ts —— 纯对话模型页的静态配置与类型
// 来源页面：llmModels/chat.vue 组件化拆分
import { LlmTaskType } from '~~/types/llmModel';

/** 对话消息（/api/ai/chat 请求体） */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 徽标展示配置（label + el-tag 颜色） */
export type BadgeTag = 'primary' | 'success' | 'info' | 'warning' | 'danger';
export interface BadgeUi {
  key: import('~~/types/llmModel').LlmModelBadge;
  label: string;
  tag: BadgeTag;
}
export const BADGE_UI: readonly BadgeUi[] = [
  { key: 'cloudflareHosted', label: 'CF 托管', tag: 'info' },
  { key: 'beta', label: '公测', tag: 'warning' },
  { key: 'deprecated', label: '已弃用', tag: 'danger' },
  { key: 'partner', label: '第三方', tag: 'info' },
  { key: 'batch', label: '批量', tag: 'info' },
  { key: 'realtime', label: '实时', tag: 'success' },
  { key: 'lora', label: 'LoRA', tag: 'info' },
  { key: 'functionCalling', label: '函数调用', tag: 'success' },
  { key: 'reasoning', label: '推理', tag: 'success' },
  { key: 'vision', label: '视觉', tag: 'success' },
];

/** 厂商名 → Cloudflare 模型 ID 前缀（"Black Forest Labs" → "black-forest-labs"） */
export function slugAuthor(author: string): string {
  return author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** 拼装 Workers AI 完整调用 ID；按 @cf/{厂商slug}/{name} 约定拼接 */
export function toModelId(author: string, name: string): string {
  return `@cf/${slugAuthor(author)}/${name}`;
}

/** 对话 / 生图各自可用的任务类型（不匹配时按钮走 API 默认模型） */
export const CHAT_TASKS: readonly LlmTaskType[] = [
  LlmTaskType.TEXT_GENERATION,
  LlmTaskType.IMAGE_TEXT_TO_TEXT,
];
export const IMAGE_TASKS: readonly LlmTaskType[] = [LlmTaskType.TEXT_TO_IMAGE];
