<template>
  <div class="map-page">
    <div ref="containerRef" class="map-container"></div>
    <div class="toolbar">
      <button :disabled="locating" @click="handleLocate">
        {{ locating ? '定位中…' : '定位到我' }}
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

// ⬇️ 用契约，不再 Awaited<ReturnType<...>>
let amap: AmapBundle | null = null;

const locating = ref(false);
const address = ref('');

onMounted(async () => {
  if (!containerRef.value) return;
  amap = await useAmap(containerRef.value);
  map = amap.map;
});

const handleLocate = async () => {
  if (!amap || locating.value) return;
  locating.value = true;
  try {
    const { lng, lat, address: addr } = await amap.getLocation();
    console.log('经纬度:', lng, lat);
    address.value = addr ?? `${lng.toFixed(6)}, ${lat.toFixed(6)}`;
  } catch (e) {
    address.value = '定位失败：' + (e as Error).message;
  } finally {
    locating.value = false;
  }
};

onBeforeUnmount(() => {
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
  /* 容器必须有明确高度，否则地图白屏 */
  height: calc(100vh - 100px);
}

.toolbar {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10; /* 必须高于地图，否则被地图盖住 */
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  background: #fff;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
}
</style>
