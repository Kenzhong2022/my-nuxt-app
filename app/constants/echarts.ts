// app/constants/echarts.ts
// ECharts 图表全局配置常量
// 命名规则：按 ECharts 配置层级结构命名，用下划线分隔层级
// 色彩方案：
//   Light 模式 → 蓝紫色系（商务、清爽）
//   Dark 模式  → 红黄色系（醒目、温暖、高对比）

// ========== Grid 配置 ==========
// 控制图表绘图区域在画布中的边距
// top/right/bottom/left 单位为像素
// containLabel: true 表示自动将轴标签计算在内，防止溢出
export const GRID_CONFIG = {
  top: 50, // 顶部留白：给标题、图例、Y轴 name 留空间
  right: 50, // 右侧留白：防止数据点贴边
  bottom: 28, // 底部留白：给 X 轴标签留空间
  left: 10, // 左侧基础边距（实际标签区域由 containLabel 自动扩展）
  containLabel: true, // 自动包含轴标签在内计算边距
} as const;

// ========== Tooltip 基础配置（Light 模式） ==========
// 使用 CSS 变量，跟随 Element Plus 主题自动切换
export const TOOLTIP_STYLE = {
  backgroundColor: "var(--el-card-bg-color)", // 背景：跟随 Element 卡片背景
  borderColor: "var(--el-border-color)", // 边框：跟随 Element 边框色
  borderWidth: 2,
  textStyle: {
    fontSize: 12,
    fontWeight: 600,
  },
  extraCssText:
    "box-shadow: 0 6px 24px rgba(0,0,0,0.12); border-radius: 10px; padding: 10px 14px;",
} as const;

// ========== Tooltip 基础配置（Dark 模式） ==========
// 阴影更深，适配深色背景
export const TOOLTIP_STYLE_DARK = {
  backgroundColor: "var(--el-card-bg-color)",
  borderColor: "var(--el-border-color)",
  borderWidth: 2,
  textStyle: {
    fontSize: 12,
    fontWeight: 600,
  },
  extraCssText:
    "box-shadow: 0 6px 24px rgba(0,0,0,0.3); border-radius: 10px; padding: 10px 14px;",
} as const;

// ========== 图表主题色系类型（层级命名） ==========
// 命名格式：{层级}_{属性}，对应 ECharts 配置路径
// 例如：emphasis_itemStyle_shadowColor → emphasis.itemStyle.shadowColor
export interface ChartTheme {
  // ========== series.itemStyle ==========
  /** 默认 itemStyle.color（3色渐变）→ series[].itemStyle.color */
  itemStyle_color: readonly [string, string, string];
  /** 默认 itemStyle.shadowColor → series[].itemStyle.shadowColor */
  itemStyle_shadowColor: string;
  /** 默认 itemStyle.borderColor → series[].itemStyle.borderColor */
  itemStyle_borderColor: string;

  // ========== series.itemStyle（当前高亮状态） ==========
  /** 当前高亮 itemStyle.color（3色渐变）→ series[].itemStyle.color (当前) */
  active_itemStyle_color: readonly [string, string, string];
  /** 当前高亮 itemStyle.shadowColor → series[].itemStyle.shadowColor */
  active_itemStyle_shadowColor: string;
  /** 当前高亮 itemStyle.borderColor → series[].itemStyle.borderColor */
  active_itemStyle_borderColor: string;

  // ========== series.itemStyle（未激活/占位状态） ==========
  /** 未激活 itemStyle.color（2色渐变）→ series[].itemStyle.color (未来/空值) */
  inactive_itemStyle_color: readonly [string, string];

  // ========== series.lineStyle ==========
  /** 折线线条颜色（2色渐变）→ series[].lineStyle.color */
  lineStyle_color: readonly [string, string];
  /** 折线阴影 → series[].lineStyle.shadowColor */
  lineStyle_shadowColor: string;

  // ========== series.areaStyle ==========
  /** 面积图填充颜色（3色渐变，含透明度）→ series[].areaStyle.color */
  areaStyle_color: readonly [string, string, string];

  // ========== series.emphasis.itemStyle ==========
  /** emphasis.itemStyle.shadowBlur → 悬停时阴影模糊程度（数值，如 22） */
  emphasis_itemStyle_shadowBlur: number;
  /** emphasis.itemStyle.shadowColor → series[].emphasis.itemStyle.shadowColor */
  emphasis_itemStyle_shadowColor: string;
  /** emphasis.itemStyle.borderColor → series[].emphasis.itemStyle.borderColor */
  emphasis_itemStyle_borderColor: string;

  // ========== markLine.lineStyle ==========
  /** markLine 线条颜色 → markLine.lineStyle.color */
  markLine_lineStyle_color: string;
  /** markLine 标签文字颜色 → markLine.label.color */
  markLine_label_color: string;

  // ========== axisLine.lineStyle ==========
  /** 轴线颜色 → axisLine.lineStyle.color */
  axisLine_lineStyle_color: string;

  // ========== axisLabel ==========
  /** 轴标签文字颜色 → xAxis/yAxis.axisLabel.color */
  axisLabel_color: string;

  // ========== title / tooltip 标题 ==========
  /** 标题/主文字颜色 → title.textStyle.color */
  title_textStyle_color: string;

  // ========== tooltip.textStyle ==========
  /** tooltip 文字颜色 → tooltip.textStyle.color */
  tooltip_textStyle_color: string;
}

// ========== 图表色系（Light / Dark） ==========
// 使用 `as const` 冻结对象，防止运行时意外修改
// 使用 `ChartTheme` 接口约束结构，确保 Light/Dark 字段完全一致
export const CHART_COLORS = {
  /** 浅色模式（默认）：蓝紫色系
   * 主色调：Indigo/Violet，商务清爽
   * 当前高亮：琥珀金，黑白通用
   * 适合：白色背景、高亮环境
   */
  light: {
    // --- series.itemStyle ---
    // 主色渐变：蓝紫色系（Indigo → Violet）
    // 在白色背景上对比度适中，商务感强、视觉舒适
    itemStyle_color: ["#a5b4fc", "#6366f1", "#4f46e5"],
    itemStyle_shadowColor: "rgba(0,0,0,0.08)", // 极淡阴影，不喧宾夺主
    itemStyle_borderColor: "rgba(255,255,255,0.3)", // 半透明白边，增加立体感

    // --- series.itemStyle (active) ---
    // 当前高亮：琥珀金色系（Amber → Orange）
    // 黑白模式通用，高对比度，醒目突出当前时段
    active_itemStyle_color: ["#fbbf24", "#f59e0b", "#d97706"],
    active_itemStyle_shadowColor: "rgba(245,158,11,0.45)", // 琥珀金阴影
    active_itemStyle_borderColor: "rgba(255,255,255,0.7)", // 亮白边，增强发光感

    // --- series.itemStyle (inactive) ---
    // 未来/空值：浅灰色系
    // 低饱和度，不干扰主数据，暗示"尚未发生"
    inactive_itemStyle_color: ["#e8ecf1", "#dde1e7"],

    // --- series.lineStyle ---
    // 折线：蓝紫渐变，与柱状图主色统一
    lineStyle_color: ["#6366f1", "#a855f7"],
    lineStyle_shadowColor: "rgba(99,102,241,0.35)",

    // --- series.areaStyle ---
    // 面积图：蓝紫透明渐变，从上到下透明度递减
    areaStyle_color: [
      "rgba(99,102,241,0.22)", // 顶部：22% 不透明度
      "rgba(99,102,241,0.05)", // 中部：5% 不透明度
      "rgba(99,102,241,0.0)", // 底部：完全透明
    ],

    // --- series.emphasis.itemStyle ---
    // 悬停效果：阴影加深，增强交互反馈
    emphasis_itemStyle_shadowBlur: 22, // 阴影模糊度：较大，柔和扩散
    emphasis_itemStyle_shadowColor: "rgba(0,0,0,0.22)", // 中等黑影
    emphasis_itemStyle_borderColor: "rgba(255,255,255,0.7)", // 保持亮边

    // --- markLine ---
    // 参考线：浅灰，低调不抢数据风头
    markLine_lineStyle_color: "#cbd5e1", // Tailwind slate-300
    markLine_label_color: "#94a3b8", // Tailwind slate-400

    // --- axisLine ---
    axisLine_lineStyle_color: "#cbd5e1", // 与 markLine 统一

    // --- axisLabel ---
    axisLabel_color: "#94a3b8", // 浅灰，次要信息

    // --- title ---
    title_textStyle_color: "#334155", // 深灰，主要信息

    // --- tooltip ---
    tooltip_textStyle_color: "#334155", // 深灰，确保可读性
  } satisfies ChartTheme,

  /** 深色模式：红黄色系
   * 主色调：Rose/Red → Amber/Yellow，温暖醒目
   * 当前高亮：亮黄，在深色背景上极高对比
   * 适合：暗色背景、夜间环境、需要强烈视觉冲击
   */
  dark: {
    itemStyle_color: ["#22d3ee", "#0ea5e9", "#6366f1"],
    active_itemStyle_color: ["#fcd34d", "#f59e0b", "#d97706"],
    inactive_itemStyle_color: ["#1e293b", "#0f172a"],
    lineStyle_color: ["#22d3ee", "#a855f7"],
    lineStyle_shadowColor: "rgba(34,211,238,0.4)",
    areaStyle_color: [
      "rgba(34,211,238,0.20)",
      "rgba(34,211,238,0.05)",
      "rgba(34,211,238,0.0)",
    ],
    itemStyle_shadowColor: "rgba(34,211,238,0.20)",
    active_itemStyle_shadowColor: "rgba(252,211,77,0.40)",
    itemStyle_borderColor: "rgba(0,0,0,0.3)",
    active_itemStyle_borderColor: "rgba(255,255,255,0.5)",
    emphasis_itemStyle_shadowBlur: 22,
    emphasis_itemStyle_shadowColor: "rgba(34,211,238,0.30)",
    emphasis_itemStyle_borderColor: "rgba(255,255,255,0.6)",
    markLine_lineStyle_color: "#334155",
    markLine_label_color: "#94a3b8",
    axisLine_lineStyle_color: "#334155",
    axisLabel_color: "#94a3b8",
    title_textStyle_color: "#e2e8f0",
    tooltip_textStyle_color: "#e2e8f0",
  } satisfies ChartTheme,
} as const;

// ========== 获取当前主题色系 ==========
/**
 * 检测当前是否为深色模式，返回对应的 ChartTheme
 * 检测方式：检查 document.documentElement 是否有 class="dark"
 * 这是 Element Plus 的默认暗色模式标记
 *
 * 注意：此函数仅在客户端执行，服务端返回 light 默认值
 *
 * 使用方式：
 *   const theme = getChartTheme();
 *   chartOption.series[0].itemStyle.color = theme.itemStyle_color[1];
 */
export function getChartTheme(): ChartTheme {
  // 服务端渲染时返回 light 默认值（避免访问 document 报错）
  if (typeof document === "undefined") {
    return CHART_COLORS.light;
  }

  const isDark = document.documentElement.classList.contains("dark");
  console.log(isDark ? CHART_COLORS.dark : CHART_COLORS.light);
  return isDark ? CHART_COLORS.dark : CHART_COLORS.light;
}
