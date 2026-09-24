// server/utils/deepseek.ts
import OpenAI from "openai";
import type { H3Event } from "h3";

// 懒加载单例：环境变量在运行时才注入，客户端必须延迟到首次请求时创建
let client: OpenAI | null = null;

/**
 * 获取 DeepSeek 客户端（懒加载单例）
 * @param event 请求事件（透传给 useRuntimeConfig 以读取请求时刻的环境变量）
 */
export function getDeepseekClient(event?: H3Event): OpenAI {
  if (client) return client;
  const config = useRuntimeConfig(event);
  client = new OpenAI({
    apiKey: config.deepseek.apiKey,
    baseURL: config.deepseek.baseURL,
    timeout: 30000, // 30秒超时
  });
  return client;
}

/**
 * DeepSeek 官方最新模型列表（2026年6月）
 * 旧模型 deepseek-chat/deepseek-reasoner 将于 2026-07-24 停止使用
 */
export enum DeepSeekModel {
  /**
   * V4-Flash：快速经济型模型（推荐日常使用）
   * - 价格：0.5元/百万输入token，1.0元/百万输出token
   * - 速度：最快，响应延迟最低
   * - 上下文：100万token
   * - 支持思考模式
   */
  V4_FLASH = "deepseek-v4-flash",

  /**
   * V4-Pro：高性能专业模型
   * - 价格：2.0元/百万输入token，6.0元/百万输出token
   * - 能力：最强，适合复杂推理、代码、长文本处理
   * - 上下文：100万token
   * - 支持思考模式
   */
  V4_PRO = "deepseek-v4-pro",
}

/**
 * 思考模式强度（仅V4模型支持）
 */
export enum ThinkingEffort {
  LOW = "low", // 快速思考，适合简单问题
  MEDIUM = "medium", // 平衡模式（默认）
  HIGH = "high", // 深度思考，适合复杂数学/逻辑问题
  MAX = "max", // 最强思考，适合Agent、复杂推理
}
