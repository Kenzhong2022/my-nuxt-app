<template>
  <div class="map-page">
    <div ref="containerRef" class="map-container"></div>
    <div class="toolbar">
      <button :disabled="locating" @click="handleLocate">
        <div v-if="locating">
          <i-icon-park-repositioning theme="filled" size="24" fill="#333" />
        </div>
        <div v-else>
          <i-icon-park-local :width="20" :height="20" fill="#409eff" />
        </div>
      </button>
      <span v-if="address">{{ address }}</span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import type { AmapBundle } from '~/composables/useAmap';

definePageMeta({
  layout: 'default',
});

const containerRef = ref<HTMLDivElement>();

let map: AMap.Map | null = null;

// 用契约，不再 Awaited<ReturnType<...>>
let amap: AmapBundle | null = null;

let markerApi: ReturnType<AmapBundle['createMarker']> | null = null;
let circleApi: ReturnType<AmapBundle['createCircle']> | null = null;

// 上次定位精度（米），用作精度圈半径；从没定位过用默认值
let lastAccuracy = 500;

// 单击/双击区分用的定时器（提到顶层，便于卸载时清理）
let clickTimer: ReturnType<typeof setTimeout> | null = null;

const locating = ref(false);
const address = ref('');

/**
 * 生成地图标记 SVG
 * @param size  显示尺寸（宽高相同）
 * @param color 主色，默认红色
 */
const makeMarkerSvg = (size = 24, color = '#E02020') =>
  `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">` +
  `<path d="M9 18V42H39V18L24 6L9 18Z" fill="${color}" stroke="${color}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
  `<path d="M19 29V42H29V29H19Z" fill="#FFF" stroke="#FFF" stroke-width="4" stroke-linejoin="round"/>` +
  `<path d="M9 42H39" stroke="${color}" stroke-width="4" stroke-linecap="round"/>` +
  `</svg>`;

/**
 * 统一的「落点」函数：marker + 精度圈一起创建或挪动
 *
 * 定位与点击选点共用此入口，保证视觉行为一致；
 * accuracy 未传时沿用上次定位精度（点击没有新的精度信息）
 */
const dropMarker = (lng: number, lat: number, accuracy = lastAccuracy) => {
  if (!amap) return;

  // —— Marker ——（size=24，居中锚点偏移 -12,-12）
  if (markerApi) {
    markerApi.setPosition([lng, lat]); // 有 → 挪
  } else {
    markerApi = amap.createMarker([lng, lat], {
      content: makeMarkerSvg(24),
      anchor: 'center',
    });
  }

  // —— 精度圈 ——
  if (circleApi) {
    circleApi.setCenter([lng, lat]);
    circleApi.setRadius(accuracy);
  } else {
    circleApi = amap.createCircle([lng, lat], accuracy);
  }

  amap.geocoder.getAddress([lng, lat], (status, result) => {
    if (typeof result === 'string') {
      console.warn('result === "string":', status, result);
      return;
    }
    if (status === 'complete' && result.regeocode) {
      // 用 JSON 展开，结构一目了然
      console.log('完整结果:', JSON.parse(JSON.stringify(result)));
      console.log('regeocode:', JSON.parse(JSON.stringify(result.regeocode)));
      console.log('pois 列表:', JSON.parse(JSON.stringify(result.regeocode.pois)));
      console.log('pois 数量:', result.regeocode.pois?.length);
    } else {
      console.warn('逆地理编码失败:', status, result);
    }
  });
};

onMounted(async () => {
  if (!containerRef.value) return;
  amap = await useAmap(containerRef.value);
  map = amap.map;

  // 单击：延迟 250ms 落点；若期间触发 dblclick，则被取消
  map.on('click', (e) => {
    if (clickTimer) return; // 已有待处理的单击，说明这是双击的第二次
    // ⚠️ 立刻取出坐标，避免定时器延迟读取时事件对象已被回收
    const lng = e.lnglat.getLng();
    const lat = e.lnglat.getLat();

    clickTimer = setTimeout(() => {
      clickTimer = null;
      dropMarker(lng, lat);
    }, 250);
  });

  // 双击：取消待执行的单击，然后以点击位置为中心放大一级
  map.on('dblclick', (e) => {
    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }

    const lng = e.lnglat.getLng();
    const lat = e.lnglat.getLat();
    const next = Math.min(map!.getZoom() + 2, 18); // +2，最大 18 级

    map!.setZoomAndCenter(next, [lng, lat]);
  });
});

const handleLocate = async () => {
  if (!amap || locating.value) return;
  locating.value = true;
  try {
    const { lng, lat, address: addr, accuracy } = await amap.getLocation();
    address.value = addr ?? `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
    lastAccuracy = Math.max(accuracy && accuracy > 0 ? accuracy : 500, 30);
    dropMarker(lng, lat, lastAccuracy);
    const zoom = lastAccuracy <= 50 ? 16 : lastAccuracy <= 200 ? 15 : lastAccuracy <= 1000 ? 14 : 13;
    if (!map) return;
    map.setZoomAndCenter(zoom, [lng, lat]);
  } catch (e) {
    address.value = '定位失败：' + (e as Error).message;
  } finally {
    locating.value = false;
  }
};

onBeforeUnmount(() => {
  // 清掉可能待执行的单击定时器
  if (clickTimer) {
    clearTimeout(clickTimer);
    clickTimer = null;
  }

  markerApi?.destroy();
  markerApi = null; // 置空，让 GC 回收
  circleApi?.destroy();
  circleApi = null;
  map?.destroy();
  map = null;
  amap = null;
});
</script>

<style scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100%;
}

.map-container {
  width: 100%;
  height: calc(100vh - 100px);
}

.toolbar {
  position: absolute;
  bottom: 16px;
  left: 16px;
  z-index: 10;
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
}
</style>
