<!-- app.vue -->
<template>
  <div>
    <!-- <TheHeader /> -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <!-- <TheFooter /> -->
  </div>
</template>

<script setup lang="ts"></script>

<style lang="scss">
:deep(.iconfont) {
  font-family: "iconfont" !important;
}
/* 滚动条整体容器 */
::-webkit-scrollbar {
  width: 8px; /* 正常宽度，不宜过粗 */
  height: 8px;
}

/* 滚动条轨道 */
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}

/* 滚动条滑块 */
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.45);
}
</style>
