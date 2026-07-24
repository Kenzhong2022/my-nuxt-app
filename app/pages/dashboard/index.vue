<!-- pages/index.vue 或 components/Dashboard.vue -->
<template>
  <div class="dashboard">
    <!-- 统计卡片行 -->
    <div class="stats-row">
      <el-card class="stat-card">
        <div class="stat-label">今日访问量</div>
        <div class="stat-value" ref="todayValueRef">
          {{ hourlyToday?.total ?? "--" }}
        </div>
        <div class="stat-sub" :class="todayDiffClass">
          {{ todayDiffText }}
        </div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-label">昨日访问量</div>
        <div class="stat-value">
          {{ hourlyYesterday?.total ?? "--" }}
        </div>
        <div class="stat-sub">已归档</div>
      </el-card>

      <el-card class="stat-card">
        <div class="stat-label">近7天总计</div>
        <div class="stat-value">{{ daily?.total ?? "--" }}</div>
        <div class="stat-sub">日均 {{ avgDaily }} 次</div>
      </el-card>
    </div>

    <!-- 图表行 -->
    <div class="charts-row" ref="chartsRowRef">
      <el-card class="chart-card">
        <!-- 操作行 -->
        <AnalyticsFilterBar
          key="hourChartFilterBar"
          v-model:timeRange="hourChartTimeRange"
          v-model:customDate="customDate"
          :timeRangeOptions="hourChartTimeRangeOptions"
          picker-type="single"
          @export="handleExport"
        />
        <div class="chart-title">{{ hourChartTitle }}</div>
        <div
          ref="hourChartRef"
          v-loading="hourlyLoading"
          class="chart-container"
        ></div>
      </el-card>

      <el-card class="chart-card">
        <!-- 操作行 -->
        <AnalyticsFilterBar
          key="dayChartFilterBar"
          ref="filterBarRef"
          v-model:timeRange="timeRange"
          v-model:customDateRange="customDateRange"
          picker-type="range"
          @export="handleExport"
        />
        <div class="chart-title">{{ dailyChartTitle }}</div>
        <div
          ref="dayChartRef"
          v-loading="dailyLoading"
          class="chart-container"
        ></div>
      </el-card>
    </div>

    <!-- 更新时间 -->
    <div
      class="text-center text-[var(--el-text-color-secondary)]"
      v-if="updatedAt"
    >
      数据更新于 {{ formatUpdateTime(updatedAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useResizeObserver, useDebounceFn } from "@vueuse/core";
import * as echarts from "echarts";
import type {
  HourlyResponse,
  DailyResponse,
} from "~~/types/analytics/responses";
import { GRID_CONFIG, TOOLTIP_STYLE } from "~/constants/echarts";
import AnalyticsFilterBar from "./components/analyticsFilterBar.vue";

// ============ 响应式数据 ============
// 统计卡片数据（固定为今日/昨日/近7天）
const hourlyToday = ref<HourlyResponse | null>(null);
const hourlyYesterday = ref<HourlyResponse | null>(null);
const daily = ref<DailyResponse | null>(null);
// 图表数据（随筛选条件变化）
const hourlyChartData = ref<HourlyResponse | null>(null);
const dailyChartData = ref<DailyResponse | null>(null);
// 图表加载状态
const hourlyLoading = ref(false);
const dailyLoading = ref(false);

const hourChartRef = ref<HTMLDivElement | null>(null);
const dayChartRef = ref<HTMLDivElement | null>(null);
const todayValueRef = ref<HTMLDivElement | null>(null);
const filterBarRef = ref<InstanceType<typeof AnalyticsFilterBar> | null>(null);
/** 图表行容器引用，用于监听尺寸变化统一更新图表 */
const chartsRowRef = ref<HTMLDivElement | null>(null);
/** 日图表时间范围 */
const timeRange = ref<string>("7d");
/** 小时图表时间范围 */
const hourChartTimeRange = ref<string>("today");
/** 小时图表自定义日期（单日期） */
const customDate = ref<Date | null>(null);

/** 小时图表时间范围选项 */
const hourChartTimeRangeOptions = ref([
  { label: "今天", value: "today" },
  { label: "昨日", value: "yesterday" },
  { label: "自定义范围", value: "custom" },
]);
/** 日图表自定义日期范围 */
const customDateRange = ref<[Date, Date] | null>(null);

function handleExport() {
  // 导出逻辑
  console.log("导出数据", { timeRange: timeRange.value });
}
let hourChart: echarts.ECharts | null = null;
let dayChart: echarts.ECharts | null = null;
const chartTheme = useChartTheme();
// 监听主题变化，自动重绘图表
watch(chartTheme, () => {
  updateCharts();
});
// ============ 计算属性 ============
const todayDiffText = computed(() => {
  if (!hourlyToday.value || !hourlyYesterday.value) return "--";
  const diff = hourlyToday.value.total - hourlyYesterday.value.total;
  if (diff > 0) return `较昨日 ▲ +${diff}`;
  if (diff < 0) return `较昨日 ▼ ${diff}`;
  return "与昨日持平";
});

const todayDiffClass = computed(() => {
  if (!hourlyToday.value || !hourlyYesterday.value) return "";
  const diff = hourlyToday.value.total - hourlyYesterday.value.total;
  if (diff > 0) return "up";
  if (diff < 0) return "down";
  return "";
});

const avgDaily = computed(() => {
  if (!daily.value) return "--";
  return Math.round(daily.value.total / 7);
});

/** 小时图表标题 */
const hourChartTitle = computed(() => {
  if (hourChartTimeRange.value === "today") return "今日每小时访问分布";
  if (hourChartTimeRange.value === "yesterday") return "昨日每小时访问分布";
  if (hourChartTimeRange.value === "custom" && hourlyChartData.value) {
    return `${hourlyChartData.value.date} 每小时访问分布`;
  }
  return "每小时访问分布";
});

/** 日图表标题 */
const dailyChartTitle = computed(() => {
  const rangeLabels: Record<string, string> = {
    "7d": "近7天每日访问趋势",
    "30d": "近30天每日访问趋势",
    "90d": "近90天每日访问趋势",
    year: "今年每日访问趋势",
  };
  if (timeRange.value === "custom" && dailyChartData.value) {
    return `${dailyChartData.value.startDate} 至 ${dailyChartData.value.endDate} 每日访问趋势`;
  }
  return rangeLabels[timeRange.value] ?? "每日访问趋势";
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
 * @description 创建线性渐变
 * @param x0 渐变起始点 x 坐标
 * @param y0 渐变起始点 y 坐标
 * @param x1 渐变结束点 x 坐标
 * @param y1 渐变结束点 y 坐标
 * @param stops 渐变停止点数组，每个元素为 [offset, color] 格式
 * @returns 线性渐变对象
 */
function createLinearGradient(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  stops: [number, string][],
): echarts.graphic.LinearGradient {
  return new echarts.graphic.LinearGradient(
    x0,
    y0,
    x1,
    y1,
    stops.map(([offset, color]) => ({ offset, color })),
  );
}

/**
 * 向上取整到“漂亮”的刻度，优先取 1、2、5 的倍数。
 */
function roundUpToNiceNumber(value: number): number {
  if (value <= 0) return 10;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const normalized = value / magnitude;
  // 1, 2, 5, 10 是最常用的刻度基数
  let step = 1;
  if (normalized > 1) step = 2;
  if (normalized > 2) step = 5;
  if (normalized > 5) step = 10;
  return step * magnitude;
}

/**
 * 构建每小时柱状图配置
 * @param hourlyData 24 小时访问量数组
 * @param isToday 是否为今日数据（控制当前小时高亮）
 */
function buildHourOption(
  hourlyData: number[],
  isToday: boolean = true,
): echarts.EChartsOption {
  const currentHour = isToday ? new Date().getHours() : -1;
  const maxVal = Math.max(...hourlyData, 10);
  const roundedMax = roundUpToNiceNumber(maxVal);

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
      max: roundedMax,
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
 * 构建每日折线图配置
 * @param dailyData 每日访问量数组
 * @param dates 对应的日期字符串数组（YYYY-MM-DD），用于生成标签和判断今天
 */
function buildDayOption(
  dailyData: number[],
  dates?: string[],
): echarts.EChartsOption {
  const maxVal = Math.max(...dailyData, 10);
  const roundedMax = roundUpToNiceNumber(maxVal);

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Shanghai",
  });

  const dayLabels: string[] = dates
    ? dates.map((d) =>
        new Date(d).toLocaleDateString("zh-CN", {
          month: "2-digit",
          day: "2-digit",
        }),
      )
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date(Date.now() - (6 - i) * 86400000);
        return d.toLocaleDateString("zh-CN", {
          timeZone: "Asia/Shanghai",
          month: "2-digit",
          day: "2-digit",
        });
      });

  return {
    tooltip: {
      trigger: "axis",
      ...TOOLTIP_STYLE,
      formatter: (params: any) => {
        const p = params[0];
        const isToday = dates
          ? dates[p.dataIndex] === todayStr
          : p.dataIndex === 6;
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
          dates
            ? dates[params.dataIndex] === todayStr
              ? 14
              : 10
            : params.dataIndex === 6
              ? 14
              : 10,
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
function updateCharts() {
  if (hourChart && hourlyChartData.value) {
    const isToday = hourChartTimeRange.value === "today";
    hourChart.setOption(
      buildHourOption(hourlyChartData.value.hourlyVisits, isToday),
      {
        notMerge: true,
      },
    );
  }
  if (dayChart && dailyChartData.value) {
    dayChart.setOption(
      buildDayOption(
        dailyChartData.value.dailyVisits,
        dailyChartData.value.dates,
      ),
      {
        notMerge: true,
      },
    );
  }
}

const updatedAt = ref<string>("");

/** 格式化日期为 YYYY-MM-DD（北京时间） */
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" });
}

/**
 * 获取小时图表数据（随筛选条件变化）
 */
async function fetchHourlyChart() {
  let dateStr: string | undefined;

  if (hourChartTimeRange.value === "today") {
    dateStr = undefined;
  } else if (hourChartTimeRange.value === "yesterday") {
    dateStr = formatDate(new Date(Date.now() - 86400000));
  } else if (hourChartTimeRange.value === "custom" && customDate.value) {
    dateStr = formatDate(customDate.value);
  } else {
    return; // 自定义模式但未选择日期
  }

  hourlyLoading.value = true;
  try {
    const res = await $fetch<HourlyResponse>("/api/public/analytics/hourly", {
      query: dateStr ? { date: dateStr } : {},
    });
    hourlyChartData.value = res;
    if (hourChart) {
      const isToday = hourChartTimeRange.value === "today";
      hourChart.setOption(buildHourOption(res.hourlyVisits, isToday), {
        notMerge: true,
      });
    }
  } catch (err) {
    console.error("获取小时访问数据失败:", err);
  } finally {
    hourlyLoading.value = false;
  }
}

/**
 * 获取日图表数据（随筛选条件变化）
 */
async function fetchDailyChart() {
  const query: Record<string, string> = {};

  if (timeRange.value === "custom" && customDateRange.value) {
    query.startDate = formatDate(customDateRange.value[0]);
    query.endDate = formatDate(customDateRange.value[1]);
  } else if (timeRange.value === "7d") {
    // API 默认近 7 天，无需传参
  } else if (timeRange.value === "30d") {
    query.startDate = formatDate(new Date(Date.now() - 29 * 86400000));
  } else if (timeRange.value === "90d") {
    query.startDate = formatDate(new Date(Date.now() - 89 * 86400000));
  } else if (timeRange.value === "year") {
    const now = new Date();
    query.startDate = `${now.getFullYear()}-01-01`;
  } else {
    return; // 自定义模式但未选择日期范围
  }

  dailyLoading.value = true;
  try {
    const res = await $fetch<DailyResponse>("/api/public/analytics/daily", {
      query,
    });
    dailyChartData.value = res;
    if (dayChart) {
      dayChart.setOption(buildDayOption(res.dailyVisits, res.dates), {
        notMerge: true,
      });
    }
  } catch (err) {
    console.error("获取日期访问数据失败:", err);
  } finally {
    dailyLoading.value = false;
  }
}

/**
 * 获取统计卡片数据（固定为今日/昨日/近7天）
 */
async function fetchData() {
  hourlyLoading.value = true;
  dailyLoading.value = true;
  try {
    const yesterdayStr = formatDate(new Date(Date.now() - 86400000));

    const [todayRes, yesterdayRes, dailyRes] = await Promise.all([
      $fetch<HourlyResponse>("/api/public/analytics/hourly"),
      $fetch<HourlyResponse>("/api/public/analytics/hourly", {
        query: { date: yesterdayStr },
      }),
      $fetch<DailyResponse>("/api/public/analytics/daily"),
    ]);

    hourlyToday.value = todayRes;
    hourlyYesterday.value = yesterdayRes;
    daily.value = dailyRes;

    // 初始化图表数据
    hourlyChartData.value = todayRes;
    dailyChartData.value = dailyRes;

    updatedAt.value = new Date(Date.now() + 8 * 60 * 60 * 1000)
      .toISOString()
      .replace("Z", "+08:00");

    updateCharts();
  } catch (err) {
    console.error("获取仪表盘数据失败:", err);
  } finally {
    hourlyLoading.value = false;
    dailyLoading.value = false;
  }
}

// ============ 监听筛选变化，触发接口请求 ============
watch([hourChartTimeRange, customDate], () => {
  fetchHourlyChart();
});

watch([timeRange, customDateRange], () => {
  fetchDailyChart();
});

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
  if (hourChart && dayChart) {
    hourChart.resize();
    dayChart.resize();
  } else {
    ElMessage.error("图表未初始化");
  }
}, 500);

useResizeObserver(chartsRowRef, debouncedResize);

onBeforeUnmount(() => {
  hourChart?.dispose();
  hourChart = null;
  dayChart?.dispose();
  dayChart = null;
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
      .custom-date-picker {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 280px;

        .el-date-editor {
          width: 100%;
        }
      }

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
