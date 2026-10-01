<template>
  <div class="map-page">
    <div ref="mapRef" class="map-container"></div>

    <!-- 正片叠底夜间遮罩 mask，兄弟节点，不能放进 map‑container 内部 -->
    <div v-if="enableDarkMask" class="map-dark-mask"></div>

    <!-- 地图 SDK 加载遮罩：消费 amapState.mapLoading（SDK+瓦片渲染过程），complete 回调放行 -->
    <PageTransition :isFullScreen="false" :loading="amapState.mapLoading.value" />
    <!-- 加载失败：错误信息 + 重试 -->
    <div v-if="amapState.error.value" class="map-error">
      <p>地图加载失败：{{ amapState.error.value.message }}</p>
      <button @click="initMap">重试</button>
    </div>
    <!-- 未初始化时的启动入口：点击后才加载高德 SDK（懒初始化，避免进页即消耗配额） -->
    <button v-if="!initialized" class="map-init-btn" :disabled="amapState.mapLoading.value" @click="initMap">
      初始化地图
    </button>
    <div class="toolbar">
      <!-- 定位按钮：消费 amapState.locating（getLocation 内部自动扭转，无需页面手动管理） -->
      <button :disabled="amapState.locating.value" @click="handleLocate">
        <div v-if="amapState.locating.value">
          <i-icon-park-repositioning theme="filled" size="24" />
        </div>
        <div v-else>
          <i-icon-park-local :width="20" :height="20" />
        </div>
      </button>
      <span v-if="address">{{ address }}</span>

      <!-- 新增：夜间滤镜开关按钮 -->
      <button class="mask-toggle-btn" @click="enableDarkMask = !enableDarkMask">
        {{ enableDarkMask ? '关闭夜间滤镜' : '开启夜间滤镜' }}
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { amapState } from '~/composables/useAmap';
import type { AmapBundle } from '~/composables/useAmap';

definePageMeta({
  layout: 'default',
});
const mapRef = ref<HTMLDivElement>();
let map: AMap.Map | null = null;
// 用契约，不再 Awaited<ReturnType<...>>
let amap: AmapBundle | null = null;
let markerApi: ReturnType<AmapBundle['createMarker']> | null = null;
let circleApi: ReturnType<AmapBundle['createCircle']> | null = null;
// 上次定位精度（米），用作精度圈半径；从没定位过用默认值
let lastAccuracy = 500;
// 单击/双击区分用的定时器（提到顶层，便于卸载时清理）
let clickTimer: ReturnType<typeof setTimeout> | null = null;
// 是否已初始化（响应式标记，驱动启动按钮显隐；map 为普通变量不触发渲染）
const initialized = ref(false);
const address = ref('');

// ========= 新增：夜间mask开关 =========
const enableDarkMask = ref(false);

// 页面暗色模式（useThemeDark 全局单例），变化时联动切换底图主题
const isDark = useThemeDark();
// 未初始化/未渲染完成时跳过：initMap 会读取当时主题写入配置，无需提前切换
watch(isDark, (dark) => {
  if (!amap || !amapState.isLoaded.value) return;
  amap.setMapTheme(dark);
});

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

/**
 * 初始化地图：加载 SDK + 注册单击/双击事件
 *
 * 入口有三处：启动按钮、失败重试按钮、（无自动初始化）；
 * useAmap 全局单例，重复调用直接复用已缓存实例
 */
const initMap = async () => {
  if (!mapRef.value || map) return; // 已初始化则跳过
  try {
    amap = await useAmap(mapRef.value);
  } catch {
    // 错误对象已存入 amapState.error，提示层展示交给模板
    return;
  }
  map = amap.map;
  initialized.value = true;
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
};

const handleLocate = async () => {
  // 防重入：amapState.locating 由 getLocation 内部扭转，页面只读消费
  if (!amap || amapState.locating.value) return;
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
  initialized.value = false;
});
</script>

<style scoped>
.map-page {
  position: relative;
  width: 100%;
  height: 100%;
  /* 关键：不能 isolate，否则 mix‑blend‑mode 失效 */
  isolation: auto;
}
.map-container {
  width: 100%;
  height: calc(100vh - 100px);
}

/* 夜间正片叠底遮罩，scoped 需要 :deep */
:deep(.map-dark-mask) {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  /* 深蓝底色模拟夜间；换成 #000 就是纯黑压暗 */
  background-color: #070b1a;
  mix-blend-mode: multiply;
  opacity: 0.52;
}

/* 未初始化时的启动按钮：居中悬浮 */
.map-init-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10;
  padding: 10px 32px;
  font-size: 15px;
  color: var(--el-color-white);
  cursor: pointer;
  background: var(--el-color-primary);
  border: none;
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
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
  background: var(--el-bg-color-overlay);
  border-radius: 6px;
  box-shadow: var(--el-box-shadow-light);
}
/* 定位按钮：图标色由 CSS color 控制（IconPark 默认 currentColor），随主题切换 */
.toolbar button {
  color: var(--el-color-primary);
  &:disabled {
    color: var(--el-text-color-primary);
  }
}
.mask-toggle-btn {
  font-size: 13px;
  padding: 4px 10px;
}
/* SDK 加载失败提示层：居中展示错误与重试入口 */
.map-error {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 11;
  padding: 16px 24px;
  text-align: center;
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  p {
    margin-bottom: 12px;
    font-size: 14px;
    color: var(--el-color-danger);
  }
  button {
    padding: 6px 20px;
    color: var(--el-color-white);
    cursor: pointer;
    background: var(--el-color-primary);
    border: none;
    border-radius: 4px;
  }
}
</style>
