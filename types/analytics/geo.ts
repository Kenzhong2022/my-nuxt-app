// types/analytics/geo.ts

/**
 * 城市热力图查询参数
 * - timeRange 可选：不传或传 "all" 时默认返回全部时间段数据
 * - 时间段以 4 个月为单位递增（4m/8m/12m）
 * - region 可选：不传时展示全国城市，传了则聚焦该省
 * - topN 默认50：城市太多热力图会过密，50个是视觉最佳平衡点
 */
export interface CityHeatmapQuery {
  /** 时间范围（不传或 "all" 表示全部时间） */
  timeRange?: "all" | "4m" | "8m" | "12m" | "today" | "7d" | "30d" | "year" | "custom";

  /** 自定义起止时间（timeRange=custom 时必填） */
  startDate?: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD

  /** 省份筛选（可选，不传则全国） */
  region?: string; // 如："江苏省"

  /** 返回城市数量上限（默认50，最大100） */
  topN?: number;
}

/**
 * 单个城市热力数据点
 * 设计原因：
 * - 用 name/value 格式直接兼容 ECharts map 系列
 * - 额外带 uv/percent 支持 tooltip 丰富展示
 */
export interface CityHeatmapItem {
  /** 城市名称（ECharts 地图需要） */
  name: string; // 如："南京市"

  /** 访问量（ECharts value 字段） */
  value: number; // PV

  /** 独立访客 */
  uv: number;

  /** 占该省/全国百分比 */
  percent: number; // 如：15.2
}
