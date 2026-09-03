<!-- components/CityHeatmap.vue -->
<template>
  <div ref="chartRef" class="city-heatmap"></div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts';
import type { CityHeatmapResponse } from '~~/types/analytics';
import type { ChinaCityGeoJSON } from '~~/types/geo/chinaCity';

const props = defineProps<{
  data: CityHeatmapResponse | null;
}>();

const chartRef = ref<HTMLDivElement>();
let chart: echarts.ECharts | null = null;
// 中断 geoJSON 加载的控制器：离开页面/卸载时 abort
let mapAbort: AbortController | null = null;

/** 判断是否为主动中止（AbortController.abort 触发的中断，可静默忽略） */
function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}

async function initChart() {
  if (!chartRef.value || !props.data) return;

  // 1. 加载中国地图 geoJSON（中断后立即 return，避免注册已取消的请求）
  mapAbort?.abort(); // 数据变化重跑时，先取消上一次未完成的加载
  mapAbort = new AbortController();
  try {
    const chinaJson = (await $fetch<ChinaCityGeoJSON>('/geo/china-city.json', {
      signal: mapAbort.signal,
    }));
    if (mapAbort.signal.aborted) return; // 已被中断，丢弃本次结果
    echarts.registerMap('china', chinaJson);
  } catch (e) {
    if (isAbortError(e)) return; // 主动取消，不做任何提示
    throw e;
  }

  // 2. 初始化图表
  chart = echarts.init(chartRef.value);

  // 3. 配置
  const option: echarts.EChartsOption = {
    title: {
      text: `${props.data.regionName}城市访问热力`,
      subtext: `总访问量: ${props.data.totalVisits}`,
      left: 'center',
    },
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const d = params.data;
        return `${d.name}<br/>PV: ${d.value}<br/>UV: ${d.uv}<br/>占比: ${d.percent}%`;
      },
    },
    visualMap: {
      min: 0,
      max: props.data.maxValue,
      left: 'left',
      top: 'bottom',
      text: ['高', '低'],
      calculable: true,
      inRange: {
        color: ['#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'],
      },
    },
    series: [
      {
        name: '访问量',
        type: 'map',
        map: 'china',
        roam: true, // 允许缩放拖拽
        zoom: 1.2,
        emphasis: {
          label: { show: true },
          itemStyle: {
            areaColor: '#ffd700',
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

// 具名函数引用，保证 add/remove 的是同一个监听器
const handleResize = () => chart?.resize();

function addResizeListener() {
  // 先删除旧监听再重新注册，避免重复（removeEventListener 对不存在的监听是无害操作）
  window.removeEventListener('resize', handleResize);
  window.addEventListener('resize', handleResize);
}

function removeResizeListener() {
  window.removeEventListener('resize', handleResize);
}

onMounted(addResizeListener);
// keepalive 页面激活回来时重新监听
onActivated(addResizeListener);
// 离开页面（缓存失活）时卸载监听并中断未完成的地图加载
onDeactivated(() => {
  removeResizeListener();
  mapAbort?.abort();
});
// 组件真正销毁时卸载监听、中断加载并释放图表
onUnmounted(() => {
  removeResizeListener();
  mapAbort?.abort();
  chart?.dispose();
});

/** 导出当前图表数据为 CSV */
function exportCsv(): boolean {
  if (!props.data) return false;
  const { cities, totalVisits } = props.data;
  downloadCsv('城市访问分布', [['城市', '访问量'], ...cities.map((c) => [c.name, c.value]), ['总计', totalVisits]]);
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
