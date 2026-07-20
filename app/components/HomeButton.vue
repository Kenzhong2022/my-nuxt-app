<template>
  <div class="home-button-wrapper">
    <i class="iconfont icon-home home-button-icon" @click="handleClick" />
  </div>
</template>

<script setup lang="ts">
import { navigateTo } from "nuxt/app";

function handleClick() {
  navigateTo("/");
}
</script>

<style scoped>
.home-button-wrapper {
  position: fixed;
  top: 10px;
  left: 10px;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 2px solid var(--el-color-primary);
  cursor: pointer;
  background: var(--el-bg-color-page);
}

.home-button-icon {
  font-size: 36px;
  color: var(--el-color-primary);
}
</style>
