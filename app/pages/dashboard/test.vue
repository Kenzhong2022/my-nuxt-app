<!-- pages/analytics/geo.vue -->
<template>
  <div class="geo-analytics">
    <CityHeatmap :data="data" />
  </div>
</template>

<script setup lang="ts">
import CityHeatmap from "./components/CityHeatmap.vue";
import type { CityHeatmapResponse } from "~~/types/analytics/responses.js";

const data = ref<CityHeatmapResponse | null>(null);
async function fetchData() {
  const res = await $fetch("/api/public/analytics/city-heatmap?timeRange=7d");
  data.value = res;
  console.log("heatmapData", res);
}
onMounted(() => {
  fetchData();
});
</script>
