<template>
  <div class="feature-block-container flex flex-row items-center gap-2">
    <div class="feature-block">
      <component :is="icon" v-if="icon" class="feature-icon" />
      <h3>{{title}}</h3>
      <p>{{desc}}</p>
    </div>
    <div class="divider-line">|||</div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

const props = defineProps<{
  title: string
  desc: string
  /** 图标组件（vite-svg-loader 导入的 SVG），不传则不渲染 */
  icon?: Component
}>()
</script>

<style scoped lang="scss">
// ===================== 功能块 =====================
// 黑色为模块设计语言（浅/深色主题下保持一致），用局部变量声明一次便于统一调整
.feature-block {
  --feature-block-bg: #222;

  background: var(--feature-block-bg);
  color: var(--el-color-white);
  padding: 1.125rem;
  border-radius: 0.75rem;
  width: 6.875rem;
  text-align: left;

  // 图标：跟随文字色（白），保留占位时期的底部间距
  .feature-icon {
    width: 1.25rem;
    height: 1.25rem;
    margin-bottom: 0.5rem;
    color: var(--el-color-white);
  }

  h3 {
    margin: 0;
    font-size: var(--kk-font-size-medium);
  }

  p {
    font-size: var(--kk-font-size-extra-small);
    opacity: 0.8;
  }

  .divider-line {
    color: var(--el-text-color-placeholder);
    margin-top: 0.5rem;
  }
}
</style>