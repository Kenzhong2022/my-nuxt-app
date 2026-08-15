<template>
  <div
    ref="chartRef"
    v-custom-loading="{ value: loading, text: loadingText }"
    class="chart-container"
  ></div>
</template>

<script setup lang="ts">
import * as echarts from "echarts";
import type { HourlyResponse } from "~~/types/analytics/responses";
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
  data: HourlyResponse | null;
  loading: boolean;
  isToday: boolean;
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

/**
 * 构建小时访问图表选项
 * @param hourlyData 小时访问数据
 * @param isToday 是否为今日数据
 */
function buildOption(
  hourlyData: number[],
  isToday: boolean,
): echarts.EChartsOption {
  const currentHour = isToday ? new Date().getHours() : -1;
  const maxVal = Math.max(...hourlyData, 10);
  const roundedMax = roundUpToNiceNumber(maxVal);
  const theme = chartTheme.value;

  return {
    tooltip: buildTooltip((params: any) => {
      const p = params[0];
      const h = p.axisValue;
      const v = p.value;
      const label = parseInt(h) === currentHour ? " ⭐ 当前时段" : "";
      return `<b>${h}:00 - ${h}:59</b>${label}<br/>访问量：<b style="font-size:15px;color:${theme.itemStyle_color[1]};">${v} 次</b>`;
    }, TOOLTIP_STYLE),
    grid: GRID_CONFIG,
    xAxis: {
      type: "category",
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      ...getAxisBaseStyle(theme),
      axisLabel: {
        ...getAxisBaseStyle(theme).axisLabel,
        interval: 2, // 间隔2个标签 相当于显示0 3 6 ... 21
      },
    },
    yAxis: {
      ...getYAxisBase(theme),
      max: roundedMax,
    },
    series: [
      {
        type: "bar",
        barWidth: "55%",
        markLine: getMarkLineConfig(roundedMax, theme),
        data: hourlyData.map((v, i) => {
          const isCurrent = i === currentHour;
          const isFuture = i > currentHour;

          let gradient: echarts.graphic.LinearGradient;
          if (isCurrent) {
            gradient = createLinearGradient(0, 0, 0, 1, [
              [0, theme.active_itemStyle_color[0] || "#000"],
              [0.4, theme.active_itemStyle_color[1] || "#000"],
              [1, theme.active_itemStyle_color[2] || "#000"],
            ]);
          } else if (isFuture) {
            gradient = createLinearGradient(0, 0, 0, 1, [
              [0, theme.inactive_itemStyle_color[0] || "#000"],
              [1, theme.inactive_itemStyle_color[1] || "#000"],
            ]);
          } else {
            gradient = createLinearGradient(0, 0, 0, 1, [
              [0, theme.itemStyle_color[0] || "#000"],
              [0.45, theme.itemStyle_color[1] || "#000"],
              [1, theme.itemStyle_color[2] || "#000"],
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
                      ? theme.active_itemStyle_shadowColor
                      : theme.itemStyle_shadowColor,
                    shadowOffsetY: 3,
                    borderColor: isCurrent
                      ? theme.active_itemStyle_borderColor
                      : theme.itemStyle_borderColor,
                    borderWidth: isCurrent ? 2 : 0.8,
                  },
          };
        }),
        emphasis: {
          itemStyle: {
            shadowColor: theme.emphasis_itemStyle_shadowColor,
            borderRadius: [9, 9, 0, 0],
            borderColor: theme.emphasis_itemStyle_borderColor,
            borderWidth: 2,
            shadowBlur: 12,
            shadowOffsetY: 3,
            opacity: 0.88,
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
  chart.setOption(buildOption(props.data.hourlyVisits, props.isToday), {
    notMerge: true,
  });
}

function handleResize() {
  chart?.resize();
  emit("resize");
}

watch(
  () => [props.data, props.isToday],
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
  const { date, hourlyVisits, total } = props.data;
  downloadCsv(`每小时访问分布_${date}`, [
    ["时段", "访问量"], // 表头
    ...hourlyVisits.map((v, i) => [
      `${String(i).padStart(2, "0")}:00-${String(i).padStart(2, "0")}:59`,
      v,
    ]),
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
