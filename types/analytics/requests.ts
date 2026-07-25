// types/analytics/request.ts

import type { DateString } from "./common";

interface DeviceInfo {
  /** 页面路径筛选（选填） */
  pagePath?: string;

  /** 设备类型筛选（选填） */
  deviceType?: "desktop" | "mobile" | "tablet";
}

export interface HourlyQuery extends DeviceInfo {
  date?: DateString;
  timezone?: string;
}

export interface DailyQuery extends DeviceInfo {
  startDate?: DateString;
  endDate?: DateString;
  timezone?: string;
}

/**
 * 埋点上报请求参数
 */
export interface TrackVisitRequest extends DeviceInfo {
  /** 页面路径（必填） */
  page: string;

  /** 页面查询参数（选填） */
  query?: Record<string, string>;

  /** 用户 ID（选填） */
  userId?: number;

  /** 来源页面（选填） */
  referer?: string;

  /** 用户代理字符串（选填，服务端可从 header 读取） */
  userAgent?: string;

  /** 会话标识（选填，无则服务端生成） */
  sessionId?: string;

  /** 页面加载耗时 ms（选填） */
  loadTimeMs?: number;

  /** 时间戳（选填，服务端可从 header 读取） */
  timestamp?: number;
}
