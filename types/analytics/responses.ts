import type { HourlyVisits, DailyVisits, DateString } from "./common";
import type { CityHeatmapItem } from "./geo";

export interface HourlyResponse {
  date: DateString;
  hourlyVisits: HourlyVisits;
  total: number;
}

export interface DailyResponse {
  startDate: DateString;
  endDate: DateString;
  dates: DateString[];
  dailyVisits: DailyVisits;
  total: number;
}

/**
 * 城市热力图响应
 * 设计原因：
 * - 返回 ECharts 可直接消费的 {name, value}[] 格式
 * - 带 total/max 支持 visualMap 动态范围
 * - 带 regionName 支持标题动态渲染
 */
export interface CityHeatmapResponse {
  /** 查询范围名称（用于图表标题） */
  regionName: string; // "全国" 或 "江苏省"

  /** 总访问量 */
  totalVisits: number;

  /** 最大单城市访问量（用于 visualMap max） */
  maxValue: number;

  /** 城市热力数据（已按 value 降序） */
  cities: CityHeatmapItem[];
}
