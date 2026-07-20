<template>
  <div class="dashboard-page">
    <h1>仪表盘</h1>
    <!-- 必须用 ClientOnly 包裹，保证 ECharts 只在客户端运行 -->
    <ClientOnly>
      <div ref="chartRef" class="chart-container" />
    </ClientOnly>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";
import type { ECharts } from "echarts";

definePageMeta({
  title: "仪表盘",
  layout: "default",
});

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: ECharts | null = null;

onMounted(async () => {
  // 动态导入 ECharts 核心库（按需加载，减小首屏体积）
  const echarts = await import("echarts");

  if (chartRef.value) {
    // 初始化图表
    chartInstance = echarts.init(chartRef.value);

    // 配置项
    const option = {
      title: { text: "ECharts 入门示例" },
      tooltip: {},
      legend: { data: ["销量"] },
      xAxis: { data: ["衬衫", "羊毛衫", "雪纺衫", "裤子", "高跟鞋", "袜子"] },
      yAxis: {},
      series: [{ name: "销量", type: "bar", data: [5, 20, 36, 10, 10, 20] }],
    };

    chartInstance.setOption(option);
  }
});

// 组件卸载时销毁图表实例
onBeforeUnmount(() => {
  chartInstance?.dispose();
});
</script>

<style scoped>
.dashboard-page {
  padding: 20px;
}
.chart-container {
  width: 100%;
  height: 400px;
  min-height: 300px;
}
</style>
