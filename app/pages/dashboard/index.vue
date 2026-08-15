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
          @export="handleExport('hourly')"
        />
        <div class="chart-title">{{ hourChartTitle }}</div>
        <HourlyChart
          ref="hourlyChartRef"
          :data="hourlyChartData"
          :loading="hourlyLoading"
          :isToday="hourChartTimeRange === 'today'"
          @chart-ready="handleHourlyChartReady"
        />
      </el-card>

      <el-card class="chart-card">
        <!-- 操作行 -->
        <AnalyticsFilterBar
          key="dayChartFilterBar"
          ref="filterBarRef"
          v-model:timeRange="timeRange"
          v-model:customDateRange="customDateRange"
          picker-type="range"
          @export="handleExport('daily')"
        />
        <div class="chart-title">{{ dailyChartTitle }}</div>
        <DailyChart
          ref="dailyChartRef"
          :data="dailyChartData"
          :loading="dailyLoading"
          loading-text="拼命加载中..."
          @chart-ready="handleDailyChartReady"
        />
      </el-card>
    </div>

    <!-- 热力图行 -->
    <div class="heatmap-row">
      <el-card class="chart-card">
        <!-- 文本描述 -->
        <AnalyticsFilterBar
          key="heatmapFilterBar"
          v-model:timeRange="heatmapTimeRange"
          v-model:customDateRange="heatmapCustomDateRange"
          :timeRangeOptions="heatmapTimeRangeOptions"
          picker-type="range"
          @export="handleExport('heatmap')"
        />
        <div class="chart-title">{{ heatmapChartTitle }}</div>
        <div class="chart-desc">
          基于访问者 IP
          归属地统计的城市访问分布，颜色越深代表访问量越大。可切换时间范围查看不同周期内的地域热度变化，辅助判断核心用户区域与推广落地效果。
        </div>
        <CityHeatmap ref="cityHeatmapRef" :data="cityHeatmapData" />
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
import { ElMessage } from "element-plus";
import type {
  HourlyResponse,
  DailyResponse,
  CityHeatmapResponse,
} from "~~/types/analytics/responses";
import AnalyticsFilterBar from "./components/analyticsFilterBar.vue";
import HourlyChart from "./components/HourlyChart.vue";
import DailyChart from "./components/DailyChart.vue";
import CityHeatmap from "./components/CityHeatmap.vue";

definePageMeta({
  name: "Dashboard", // 页面名称
  title: "仪表盘", // 页面标题
  layout: "default", // 指定布局
  keepalive: true, // KeepAlive 缓存
  key: "dashboard", // 路由 key
  pageTransition: {
    // 页面过渡动画
    name: "slide",
    mode: "out-in",
  },
});

// ============ 响应式数据 ============
// 统计卡片数据（固定为今日/昨日/近7天）
const hourlyToday = ref<HourlyResponse | null>(null);
const hourlyYesterday = ref<HourlyResponse | null>(null);
const daily = ref<DailyResponse | null>(null);
// 图表数据（随筛选条件变化）
const hourlyChartData = ref<HourlyResponse | null>(null);
const dailyChartData = ref<DailyResponse | null>(null);
const cityHeatmapData = ref<CityHeatmapResponse | null>(null);
// 图表加载状态
const hourlyLoading = ref(false);
const dailyLoading = ref(false);

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

/** 城市热力图时间范围（默认全部时间） */
const heatmapTimeRange = ref<string>("all");
/** 城市热力图自定义日期范围 */
const heatmapCustomDateRange = ref<[Date, Date] | null>(null);
/** 城市热力图时间范围选项（4个月为单位） */
const heatmapTimeRangeOptions = ref([
  { label: "全部时间", value: "all" },
  { label: "近 4 个月", value: "4m" },
  { label: "近 8 个月", value: "8m" },
  { label: "近 12 个月", value: "12m" },
  { label: "今年", value: "year" },
  { label: "自定义范围", value: "custom" },
]);

const hourlyChartRef = ref<InstanceType<typeof HourlyChart> | null>(null);
const dailyChartRef = ref<InstanceType<typeof DailyChart> | null>(null);
const cityHeatmapRef = ref<InstanceType<typeof CityHeatmap> | null>(null);

/** 图表 ref 映射：key 与筛选栏导出事件对应（存 ref 本身，保持响应式） */
const chartRefMap = ref({
  hourly: hourlyChartRef,
  daily: dailyChartRef,
  heatmap: cityHeatmapRef,
});

/**
 * 导出图表数据为 CSV，由各图表组件自己实现导出逻辑
 * @param key 图表标识，见 chartRefMap
 */
function handleExport(key: keyof typeof chartRefMap.value): void {
  const exported = myTryCatch(
    () => chartRefMap.value?.[key]?.exportCsv() ?? false,
    "导出",
  );
  exported
    ? ElMessage.success("导出成功")
    : ElMessage.warning("暂无可导出的数据");
}

const chartTheme = useChartTheme();

function handleHourlyChartReady() {
  console.log("小时图组件已准备就绪");
}

function handleDailyChartReady() {
  console.log("日图组件已准备就绪");
}

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

/** 城市热力图标题 */
const heatmapChartTitle = computed(() => {
  const rangeLabels: Record<string, string> = {
    all: "全部时间城市访问分布",
    "4m": "近 4 个月城市访问分布",
    "8m": "近 8 个月城市访问分布",
    "12m": "近 12 个月城市访问分布",
    year: "今年城市访问分布",
  };
  if (heatmapTimeRange.value === "custom" && heatmapCustomDateRange.value) {
    const [start, end] = heatmapCustomDateRange.value;
    return `${formatDate(start)} 至 ${formatDate(end)} 城市访问分布`;
  }
  return rangeLabels[heatmapTimeRange.value] ?? "城市访问分布";
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
 * 更新图表
 */
function updateCharts() {
  dailyChartRef.value?.resize();
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
  } catch (err) {
    console.error("获取日期访问数据失败:", err);
  } finally {
    dailyLoading.value = false;
  }
}

/**
 * 获取城市热力图数据（随筛选条件变化）
 */
async function fetchCityHeatmap() {
  const query: Record<string, string> = {};

  if (heatmapTimeRange.value === "custom" && heatmapCustomDateRange.value) {
    query.timeRange = "custom";
    query.startDate = formatDate(heatmapCustomDateRange.value[0]);
    query.endDate = formatDate(heatmapCustomDateRange.value[1]);
  } else if (heatmapTimeRange.value !== "all") {
    query.timeRange = heatmapTimeRange.value;
  }

  try {
    const res = await $fetch<CityHeatmapResponse>(
      "/api/public/analytics/city-heatmap",
      { query },
    );
    cityHeatmapData.value = res;
  } catch (err) {
    console.error("获取城市热力图数据失败:", err);
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

    const [todayRes, yesterdayRes, dailyRes, heatmapRes] = await Promise.all([
      $fetch<HourlyResponse>("/api/public/analytics/hourly"),
      $fetch<HourlyResponse>("/api/public/analytics/hourly", {
        query: { date: yesterdayStr },
      }),
      $fetch<DailyResponse>("/api/public/analytics/daily"),
      $fetch<CityHeatmapResponse>("/api/public/analytics/city-heatmap"),
    ]);

    hourlyToday.value = todayRes;
    hourlyYesterday.value = yesterdayRes;
    daily.value = dailyRes;
    cityHeatmapData.value = heatmapRes;

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

watch([heatmapTimeRange, heatmapCustomDateRange], () => {
  fetchCityHeatmap();
});

// ============ 生命周期 ============
onMounted(() => {
  fetchData();
  chartRefMap.value = {
    hourly: hourlyChartRef.value,
    daily: dailyChartRef.value,
    heatmap: cityHeatmapRef.value,
  };
});

const debouncedResize = useDebounceFn(() => {
  hourlyChartRef.value?.resize();
  dailyChartRef.value?.resize();
}, 500);

useResizeObserver(chartsRowRef, debouncedResize);
</script>

<style scoped lang="scss">
.dashboard {
  max-width: 60rem; /* 960px */
  margin: 0 auto;
  padding: 1.25rem 1rem;
  color: var(--el-text-color-primary);

  // 统计卡片行
  .stats-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.875rem;
    margin-bottom: 1rem;

    .stat-card {
      .stat-label {
        font-size: var(--kk-font-size-extra-small);
        font-weight: 600;
        color: var(--el-text-color-secondary);
        letter-spacing: 0.03125rem; /* 0.5px */
        text-transform: uppercase;
      }

      .stat-value {
        font-size: 1.875rem; /* 30px 大数字展示 */
        font-weight: 800;
        color: var(--el-text-color-primary);
        line-height: 1.2;
        margin: 0.25rem 0 0.125rem;
        font-variant-numeric: tabular-nums;
      }

      .stat-sub {
        font-size: var(--kk-font-size-extra-small);
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
    gap: 0.875rem;
    margin-bottom: 0.75rem;

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
    }

    .chart-card {
      .custom-date-picker {
        display: flex;
        flex-direction: column;
        gap: 0.625rem;
        min-width: 17.5rem;

        .el-date-editor {
          width: 100%;
        }
      }

      .chart-title {
        font-size: var(--kk-font-size-small);
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin-bottom: 0.25rem;
        padding: 0 0.25rem;
      }

      .chart-desc {
        font-size: var(--kk-font-size-extra-small);
        line-height: var(--kk-line-height-small);
        color: var(--el-text-color-secondary);
        margin-bottom: 0.5rem;
        padding: 0 0.25rem;
      }

      .chart-container {
        width: 100%;
        height: 18.75rem; /* 300px */

        @media (max-width: 700px) {
          height: 15rem; /* 240px */
        }
      }
    }
  }

  // 热力图行
  .heatmap-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.875rem;
    margin-bottom: 0.75rem;

    .chart-card {
      .chart-title {
        font-size: var(--kk-font-size-small);
        font-weight: 700;
        color: var(--el-text-color-primary);
        margin-bottom: 0.25rem;
        padding: 0 0.25rem;
      }

      .chart-desc {
        font-size: var(--kk-font-size-extra-small);
        line-height: var(--kk-line-height-small);
        color: var(--el-text-color-secondary);
        margin-bottom: 0.5rem;
        padding: 0 0.25rem;
      }
    }
  }
}
</style>
