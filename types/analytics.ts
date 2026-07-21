// types/analytics.ts

/**
 * 单条原始访问事件（埋点上报 / 数据库存储）
 */
export interface VisitRecord {
  id?: number; // 数据库自增主键（插入时可省略）
  timestamp: string; // ISO 8601 格式，如 '2026-07-20T14:35:12.123Z'
  page: string; // 页面路径，如 '/home'
  userAgent?: string | null; // 浏览器 UA
  clientIp?: string | null; // 客户端 IP
}

/**
 * 每小时访问量元组（长度固定 24，索引 0 代表 00:00～00:59）
 */
export type HourlyVisits = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * 近 7 天每日访问量元组（长度固定 7，索引 0 为 7 天前，索引 6 为今天）
 */
export type DailyVisits = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/**
 * 仪表盘聚合数据（API 返回给前端）
 * @description 包含今日每小时访问量、近 7 天每日访问量、昨日总访问量、今日总访问量、本周总访问量、最后更新时间等
 * @property {HourlyVisits} hourlyVisits - 今日每小时访问量
 * @property {DailyVisits} dailyVisits - 近 7 天每日访问量
 * @property {number} yesterdayTotal - 昨日总访问量
 * @property {number} todayTotal - 今日总访问量
 * @property {number} weekTotal - 本周总访问量
 * @property {string} updatedAt - 最后更新时间，ISO 8601 格式
 */
export interface DashboardOverview {
  hourlyVisits: HourlyVisits;
  dailyVisits: DailyVisits;
  yesterdayTotal: number;
  todayTotal: number;
  weekTotal: number;
  updatedAt: string; // ISO 8601
}
