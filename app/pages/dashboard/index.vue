<!-- pages/index.vue 或 components/Dashboard.vue -->
<template>
  <div class="dashboard">
    <!-- 统计卡片行 -->
    <div class="stats-row">
      <el-card class="stat-card">
        <div class="stat-label">今日访问量</div>
        <div class="stat-value" ref="todayValueRef">
          {{ dashboardData?.todayTotal ?? "--" }}
        </div>
        <div class="stat-sub" :class="todayDiffClass">
          {{ todayDiffText }}
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-label">昨日访问量</div>
        <div class="stat-value">
          {{ dashboardData?.yesterdayTotal ?? "--" }}
        </div>
        <div class="stat-sub">已归档</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-label">近7天总计</div>
        <div class="stat-value">{{ dashboardData?.weekTotal ?? "--" }}</div>
        <div class="stat-sub">日均 {{ avgDaily }} 次</div>
      </el-card>
    </div>

    <!-- 图表行 -->
    <div class="charts-row">
      <el-card class="chart-card">
        <div class="chart-title">今日每小时访问分布</div>
        <div ref="hourChartRef" class="chart-container"></div>
      </el-card>
      <el-card class="chart-card">
        <div class="chart-title">近7天每日访问趋势</div>
        <div ref="dayChartRef" class="chart-container"></div>
      </el-card>
    </div>

    <!-- 更新时间 -->
    <div
      class="text-center text-[var(--el-text-color-secondary)]"
      v-if="dashboardData?.updatedAt"
    >
      数据更新于 {{ formatUpdateTime(dashboardData.updatedAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import * as echarts from "echarts";
import type { DashboardOverview } from "~~/types/analytics";
import { GRID_CONFIG, TOOLTIP_STYLE } from "~/constants/echarts";
// ============ 响应式数据 ============
const dashboardData = ref<DashboardOverview | null>(null);
const hourChartRef = ref<HTMLDivElement | null>(null);
const dayChartRef = ref<HTMLDivElement | null>(null);
const todayValueRef = ref<HTMLDivElement | null>(null);

let hourChart: echarts.ECharts | null = null;
let dayChart: echarts.ECharts | null = null;
const chartTheme = useChartTheme();
// 监听主题变化，自动重绘图表
watch(chartTheme, () => {
  if (dashboardData.value) {
    updateCharts(dashboardData.value);
  }
});
// ============ 计算属性 ============
const todayDiffText = computed(() => {
  if (!dashboardData.value) return "--";
  const diff =
    dashboardData.value.todayTotal - dashboardData.value.yesterdayTotal;
  if (diff > 0) return `较昨日 ▲ +${diff}`;
  if (diff < 0) return `较昨日 ▼ -${diff}`;
  return "与昨日持平";
});

const todayDiffClass = computed(() => {
  if (!dashboardData.value) return "";
  const diff =
    dashboardData.value.todayTotal - dashboardData.value.yesterdayTotal;
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "";
});

const avgDaily = computed(() => {
  if (!dashboardData.value) return "--";
  return Math.round(dashboardData.value.weekTotal / 7);
});

// ============ 方法 ============
function formatUpdateTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleString("zh-CN", { hour12: false });
}

/**
 * 获取 CSS 变量的真实值
 * @param name 变量名，支持带或不带 -- 前缀
 * @returns 变量的真实值，若不存在返回空字符串
 */
function getCssVar(name: string): string {
  const varName = name.startsWith("--") ? name : `--${name}`;

  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim() as string;
}

/**
 * 创建柱状图的线性渐变
 */
function createLinearGradient(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
) {
  return new echarts.graphic.LinearGradient(
    x0,
    y0,
    x1,
    y1,
    stops.map(([offset, color]) => ({ offset, color })),
  );
}

/**
 * 构建今日每小时柱状图配置
 */
function buildHourOption(hourlyData: number[]): echarts.EChartsOption {
  const currentHour = new Date().getHours();
  const maxVal = Math.max(...hourlyData, 10);
  const roundedMax = Math.ceil(maxVal / 10) * 10;

  return {
    tooltip: {
      trigger: "axis",
      ...TOOLTIP_STYLE,
      formatter: (params: any) => {
        const p = params[0];
        const h = p.axisValue;
        const v = p.value;
        const label = parseInt(h) === currentHour ? " ⭐ 当前时段" : "";
        return `<b>${h}:00 - ${h}:59</b>${label}<br/>访问量：<b style="font-size:15px;color:${chartTheme.value.itemStyle_color[1]};">${v} 次</b>`;
      },
    },
    grid: GRID_CONFIG,
    xAxis: {
      type: "category",
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      axisLine: {
        lineStyle: {
          color: chartTheme.value.axisLine_lineStyle_color,
          width: 1.5,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: chartTheme.value.axisLabel_color,
        fontSize: 10,
        fontWeight: 550,
        interval: 2,
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: chartTheme.value.axisLabel_color,
        fontSize: 10,
        fontWeight: 550,
      },
      splitLine: { show: false },
      max: roundedMax + 10,
    },
    series: [
      {
        type: "bar",
        barWidth: "55%",
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: chartTheme.value.markLine_lineStyle_color,
            type: "dashed",
            width: 1,
          },
          label: {
            show: true,
            position: "end",
            formatter: "{c}",
            color: chartTheme.value.markLine_label_color,
            fontSize: 10,
          },
          data: [{ yAxis: roundedMax, name: "峰值线" }],
        },
        data: hourlyData.map((v, i) => {
          const isCurrent = i === currentHour;
          const isFuture = i > currentHour;

          let gradient: echarts.graphic.LinearGradient;
          if (isCurrent) {
            gradient = createLinearGradient(0, 0, 0, 1, [
              [0, chartTheme.value.active_itemStyle_color[0]],
              [0.4, chartTheme.value.active_itemStyle_color[1]],
              [1, chartTheme.value.active_itemStyle_color[2]],
            ]);
          } else if (isFuture) {
            gradient = createLinearGradient(0, 0, 0, 1, [
              [0, chartTheme.value.inactive_itemStyle_color[0]],
              [1, chartTheme.value.inactive_itemStyle_color[1]],
            ]);
          } else {
            gradient = createLinearGradient(0, 0, 0, 1, [
              [0, chartTheme.value.itemStyle_color[0]],
              [0.45, chartTheme.value.itemStyle_color[1]],
              [1, chartTheme.value.itemStyle_color[2]],
            ]);
          }

          return {
            value: v,
            itemStyle:
              v === 0
                ? {
                    color: "transparent",
                    shadowBlur: 0,
                    shadowColor: "transparent",
                    shadowOffsetY: 0,
                    borderColor: "transparent",
                    borderWidth: 0,
                    borderRadius: 0,
                  }
                : {
                    color: gradient,
                    borderRadius: [7, 7, 0, 0],
                    shadowBlur: isCurrent ? 18 : 6,
                    shadowColor: isCurrent
                      ? chartTheme.value.active_itemStyle_shadowColor
                      : chartTheme.value.itemStyle_shadowColor,
                    shadowOffsetY: 3,
                    borderColor: isCurrent
                      ? chartTheme.value.active_itemStyle_borderColor
                      : chartTheme.value.itemStyle_borderColor,
                    borderWidth: isCurrent ? 2 : 0.8,
                  },
          };
        }),
        emphasis: {
          itemStyle: {
            shadowBlur: chartTheme.value.emphasis_itemStyle_shadowBlur,
            shadowColor: chartTheme.value.emphasis_itemStyle_shadowColor,
            borderRadius: [9, 9, 0, 0],
            borderColor: chartTheme.value.emphasis_itemStyle_borderColor,
            opacity: 0.88,
          },
        },
      },
    ],
  };
}

/**
 * 构建近7天折线图配置
 */
function buildDayOption(dailyData: number[]): echarts.EChartsOption {
  const maxVal = Math.max(...dailyData, 10);
  const roundedMax = Math.ceil(maxVal / 10) * 10;

  const dayLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dayLabels.push(
      d.toLocaleDateString("zh-CN", {
        timeZone: "Asia/Shanghai",
        month: "2-digit",
        day: "2-digit",
      }),
    );
  }

  return {
    tooltip: {
      trigger: "axis",
      ...TOOLTIP_STYLE,
      formatter: (params: any) => {
        const p = params[0];
        const isToday = p.dataIndex === 6;
        return `<b>${p.axisValue}</b>${isToday ? " ⭐ 今天" : ""}<br/>访问量：<b style="font-size:15px;color:${chartTheme.value.itemStyle_color[1]};">${p.value} 次</b>`;
      },
    },
    grid: GRID_CONFIG,
    xAxis: {
      type: "category",
      data: dayLabels,
      axisLine: {
        lineStyle: {
          color: chartTheme.value.axisLine_lineStyle_color,
          width: 1.5,
        },
      },
      axisTick: { show: false },
      axisLabel: {
        color: chartTheme.value.axisLabel_color,
        fontSize: 10,
        fontWeight: 600,
      },
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: chartTheme.value.axisLabel_color,
        fontSize: 10,
        fontWeight: 550,
      },
      splitLine: { show: false },
      max: roundedMax + 10,
    },
    series: [
      {
        type: "line",
        smooth: 0.4,
        symbol: "circle",
        symbolSize: (_: number, params: any) =>
          params.dataIndex === 6 ? 14 : 10,
        lineStyle: {
          width: 3,
          color: createLinearGradient(0, 0, 1, 0, [
            [0, chartTheme.value.lineStyle_color[0]],
            [1, chartTheme.value.lineStyle_color[1]],
          ]),
          shadowBlur: 8,
          shadowColor: chartTheme.value.lineStyle_shadowColor,
          cap: "round",
          join: "round",
        },
        itemStyle: {
          color: chartTheme.value.lineStyle_color[0],
          borderColor: chartTheme.value.itemStyle_borderColor,
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: chartTheme.value.lineStyle_shadowColor,
        },
        areaStyle: {
          color: createLinearGradient(0, 0, 0, 1, [
            [0, chartTheme.value.areaStyle_color[0]],
            [0.6, chartTheme.value.areaStyle_color[1]],
            [1, chartTheme.value.areaStyle_color[2]],
          ]),
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: {
            color: chartTheme.value.markLine_lineStyle_color,
            type: "dashed",
            width: 1,
          },
          label: {
            show: true,
            position: "end",
            formatter: "{c}",
            color: chartTheme.value.markLine_label_color,
            fontSize: 10,
          },
          data: [{ yAxis: roundedMax, name: "峰值线" }],
        },
        data: dailyData,
        emphasis: {
          scale: true,
          itemStyle: {
            color: chartTheme.value.active_itemStyle_color[1],
            borderColor: chartTheme.value.title_textStyle_color,
            shadowBlur: 18,
            shadowColor: chartTheme.value.lineStyle_shadowColor,
          },
        },
      },
    ],
  };
}

/**
 * 更新图表
 */
function updateCharts(data: DashboardOverview) {
  if (hourChart) {
    // 构建完整的 ECharts 配置
    const option = buildHourOption(data.hourlyVisits);

    // setOption 的第一个参数：图表的配置对象（option），包含 xAxis、yAxis、series 等
    // 第二个参数（可选）：设置 { notMerge: true } 表示不合并旧配置，完全用新配置替换，
    // 适用于数据完全刷新的场景，避免样式残留或新旧配置冲突。
    hourChart.setOption(option, { notMerge: true });
  }
  if (dayChart) {
    dayChart.setOption(buildDayOption(data.dailyVisits), { notMerge: true });
  }
}

/**
 * 获取数据
 */
async function fetchData() {
  try {
    const data = await $fetch<DashboardOverview>(
      "/api/public/analytics/dashboard",
    );
    dashboardData.value = data;
    updateCharts(data);
  } catch (err) {
    console.error("获取仪表盘数据失败:", err);
  }
}

// ============ 生命周期 ============
onMounted(() => {
  if (hourChartRef.value) {
    hourChart = echarts.init(hourChartRef.value);
  }
  if (dayChartRef.value) {
    dayChart = echarts.init(dayChartRef.value);
  }
  fetchData();
});

const debouncedResize = useDebounceFn(() => {
  hourChart?.resize();
  dayChart?.resize();
}, 500);

// 监听两个容器
useResizeObserver(hourChartRef, debouncedResize);
useResizeObserver(dayChartRef, debouncedResize);

onBeforeUnmount(() => {
  hourChart?.dispose();
  dayChart?.dispose();
});
</script>

<style scoped lang="scss">
.dashboard {
  max-width: 960px;
  margin: 0 auto;
  padding: 20px 16px;
  color: var(--el-text-color-primary);

  // 统计卡片行
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 14px;
    margin-bottom: 16px;

    .stat-card {
      .stat-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--el-text-color-secondary);
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }

      .stat-value {
        font-size: 1.9rem;
        font-weight: 800;
        color: var(--el-text-color-primary);
        line-height: 1.2;
        margin: 4px 0 2px;
        font-variant-numeric: tabular-nums;
      }

      .stat-sub {
        font-size: 0.72rem;
        font-weight: 550;
        color: var(--el-text-color-regular);

        &.up {
          color: var(--el-color-success);
        }

        &.down {
          color: var(--el-color-danger);
        }
      }
    }
  }

  // 图表行
  .charts-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-bottom: 12px;

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }

    .chart-card {
      .chart-title {
        font-size: 0.82rem;
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin-bottom: 4px;
        padding: 0 4px;
      }

      .chart-container {
        width: 100%;
        height: 300px;

        @media (max-width: 700px) {
          height: 240px;
        }
      }
    }
  }
}
</style>
