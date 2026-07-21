// composables/useChartTheme.ts
import { ref, onMounted } from "vue";
import {
  CHART_COLORS,
  getChartTheme,
  type ChartTheme,
} from "~/constants/echarts";

export function useChartTheme() {
  const theme = ref<ChartTheme>(CHART_COLORS.light);

  onMounted(() => {
    theme.value = getChartTheme();

    // 可选：监听主题变化
    const observer = new MutationObserver(() => {
      theme.value = getChartTheme();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  });

  return theme;
}
