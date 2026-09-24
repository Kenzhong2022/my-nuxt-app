import { Redis } from "@upstash/redis";
import type { H3Event } from "h3";

// 懒加载单例：Worker 冷启动时环境变量可能尚未就绪，
// 必须等到第一次实际使用时再从 runtimeConfig 读取并创建客户端
let redisClient: Redis | null = null;

/**
 * 获取 Upstash Redis 客户端（懒加载单例）
 * @param event 请求事件（传入后可读取该请求时刻的环境变量）
 * @returns 已配置的 Redis 客户端；环境变量缺失时返回 null
 */
export function useRedis(event?: H3Event): Redis | null {
  if (redisClient) return redisClient;

  const { upstash } = useRuntimeConfig(event);
  const url = upstash?.redisRestUrl;
  const token = upstash?.redisRestToken;

  if (!url || !token) {
    console.warn("[Redis] 环境变量未配置，Redis 功能将不可用");
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}
