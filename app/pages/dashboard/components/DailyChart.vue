<template>
  <div
    ref="chartRef"
    v-custom-loading="{ value: loading, text: loadingText }"
    class="chart-container"
  ></div>
</template>

<script setup lang="ts">
import * as echarts from "echarts";
import type { DailyResponse } from "~~/types/analytics/responses";
import { GRID_CONFIG, TOOLTIP_STYLE } from "~/constants/echarts";
import {
  createLinearGradient,
  roundUpToNiceNumber,
  getAxisBaseStyle,
  getYAxisBase,
  getMarkLineConfig,
  buildTooltip,
} from "~/utils/chart-config";

const props = defineProps<{
  data: DailyResponse | null;
  loading: boolean;
  /** loading 提示文本，不传则用指令默认值 */
  loadingText?: string;
}>();

const emit = defineEmits<{
  (e: "chartReady"): void;
  (e: "resize"): void;
}>();

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
const chartTheme = useChartTheme();

function buildDayOption(
  dailyData: number[],
  dates?: string[],
): echarts.EChartsOption {
  const maxVal = Math.max(...dailyData, 10);
  const roundedMax = roundUpToNiceNumber(maxVal);
  const theme = chartTheme.value;

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
    tooltip: buildTooltip((params: any) => {
      const p = params[0];
      const isToday = dates
        ? dates[p.dataIndex] === todayStr
        : p.dataIndex === 6;
      return `<b>${p.axisValue}</b>${isToday ? " ⭐ 今天" : ""}<br/>访问量：<b style="font-size:15px;color:${theme.itemStyle_color[1]};">${p.value} 次</b>`;
    }, TOOLTIP_STYLE),
    grid: GRID_CONFIG,
    xAxis: {
      type: "category",
      data: dayLabels,
      ...getAxisBaseStyle(theme),
      axisLabel: {
        ...getAxisBaseStyle(theme).axisLabel,
        fontWeight: 600,
      },
    },
    yAxis: {
      ...getYAxisBase(theme),
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
            [0, theme.lineStyle_color[0] || "#000"],
            [1, theme.lineStyle_color[1] || "#000"],
          ]),
          shadowBlur: 8,
          shadowColor: theme.lineStyle_shadowColor,
          cap: "round",
          join: "round",
        },
        itemStyle: {
          color: theme.lineStyle_color[0],
          borderColor: theme.itemStyle_borderColor,
          borderWidth: 3,
          shadowBlur: 8,
          shadowColor: theme.lineStyle_shadowColor,
        },
        areaStyle: {
          color: createLinearGradient(0, 0, 0, 1, [
            [0, theme.areaStyle_color[0] || "#000"],
            [0.6, theme.areaStyle_color[1] || "#000"],
            [1, theme.areaStyle_color[2] || "#000"],
          ]),
        },
        markLine: getMarkLineConfig(roundedMax, theme),
        data: dailyData,
        emphasis: {
          scale: true,
          itemStyle: {
            color: theme.active_itemStyle_color[1],
            borderColor: theme.title_textStyle_color,
            shadowBlur: 18,
            shadowColor: theme.lineStyle_shadowColor,
          },
        },
      },
    ],
  };
}

function initChart() {
  if (!chartRef.value) return;
  chart = echarts.init(chartRef.value);
  emit("chartReady");
}

function updateChart() {
  if (!chart || !props.data) return;
  chart.setOption(buildDayOption(props.data.dailyVisits, props.data.dates), {
    notMerge: true,
  });
}

function handleResize() {
  chart?.resize();
  emit("resize");
}

watch(
  () => props.data,
  () => {
    updateChart();
  },
  { deep: true },
);

watch(chartTheme, () => {
  updateChart();
});

onMounted(() => {
  initChart();
  updateChart();
});

onBeforeUnmount(() => {
  chart?.dispose();
  chart = null;
});

/** 导出当前图表数据为 CSV */
function exportCsv(): boolean {
  if (!props.data) return false;
  const { dates, dailyVisits, total } = props.data;
  downloadCsv(`每日访问趋势_${dates[0]}_至_${dates[dates.length - 1]}`, [
    ["日期", "访问量"],
    ...dates.map((d, i) => [d, dailyVisits[i] ?? 0]),
    ["总计", total],
  ]);
  return true;
}

defineExpose({
  resize: handleResize,
  exportCsv,
});
</script>

<style scoped lang="scss">
.chart-container {
  width: 100%;
  height: 18.75rem; /* 300px */

  @media (max-width: 700px) {
    height: 15rem; /* 240px */
  }
}
</style>
