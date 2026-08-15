<!-- components/CityHeatmap.vue -->
<template>
  <div ref="chartRef" class="city-heatmap"></div>
</template>

<script setup lang="ts">
import * as echarts from "echarts";
import type { CityHeatmapResponse } from "~~/types/analytics";

const props = defineProps<{
  data: CityHeatmapResponse | null;
}>();

const chartRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;

async function initChart() {
  if (!chartRef.value || !props.data) return;

  // 1. 加载中国地图 geoJSON
  const chinaJson = (await $fetch("/geo/china-city.json")) as any;
  echarts.registerMap("china", chinaJson);

  // 2. 初始化图表
  chart = echarts.init(chartRef.value);

  // 3. 配置
  const option: echarts.EChartsOption = {
    title: {
      text: `${props.data.regionName}城市访问热力`,
      subtext: `总访问量: ${props.data.totalVisits}`,
      left: "center",
    },
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
        const d = params.data;
        return `${d.name}<br/>PV: ${d.value}<br/>UV: ${d.uv}<br/>占比: ${d.percent}%`;
      },
    },
    visualMap: {
      min: 0,
      max: props.data.maxValue,
      left: "left",
      top: "bottom",
      text: ["高", "低"],
      calculable: true,
      inRange: {
        color: ["#e0f3f8", "#abd9e9", "#74add1", "#4575b4", "#313695"],
      },
    },
    series: [
      {
        name: "访问量",
        type: "map",
        map: "china",
        roam: true, // 允许缩放拖拽
        zoom: 1.2,
        emphasis: {
          label: { show: true },
          itemStyle: {
            areaColor: "#ffd700",
          },
        },
        data: props.data.cities.map((c) => ({
          name: c.name,
          value: c.value,
          uv: c.uv,
          percent: c.percent,
        })),
      },
    ],
  };

  chart.setOption(option);
}

// 响应式
watch(() => props.data, initChart, { immediate: true });

onMounted(() => {
  window.addEventListener("resize", () => chart?.resize());
});

onUnmounted(() => {
  chart?.dispose();
});

/** 导出当前图表数据为 CSV */
function exportCsv(): boolean {
  if (!props.data) return false;
  const { cities, totalVisits } = props.data;
  downloadCsv("城市访问分布", [
    ["城市", "访问量"],
    ...cities.map((c) => [c.name, c.value]),
    ["总计", totalVisits],
  ]);
  return true;
}

defineExpose({
  exportCsv,
});
</script>

<style scoped>
.city-heatmap {
  width: 100%;
  height: 500px;
}
</style>
