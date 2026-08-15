<template>
  <div class="color-picker-container">
    <h4>切换主题颜色</h4>
    <div class="color-preset">
      <div
        v-for="color in colors"
        :key="color.value"
        class="color-item"
        :class="{ active: primaryColor === color.value }"
        :style="{ backgroundColor: color.value }"
        @click="primaryColor = color.value"
      ></div>
    </div>
    <div class="color-text">
      <span>当前：{{ primaryColor }}</span>
      <el-color-picker v-model="primaryColor" show-alpha />
    </div>

    <!-- 恢复上一次主题色 -->
    <div
      v-if="prevColor && prevColor !== primaryColor"
      class="color-prev"
      title="点击恢复上一次的主题色"
      @click="primaryColor = prevColor"
    >
      <span class="prev-swatch" :style="{ backgroundColor: prevColor }"></span>
      <span class="prev-label">恢复上次</span>
    </div>

    <el-switch
      :model-value="isDark"
      @update:model-value="(val: any) => (isDark = val)"
      active-text="Dark"
      inactive-text="Light"
    />
  </div>
</template>

<script setup lang="ts">
interface PresetColor {
  label: string;
  value: string;
}

const props = withDefaults(
  defineProps<{
    /** 预设颜色列表 */
    colors?: PresetColor[];
  }>(),
  {
    colors: () => [
      { label: "红", value: "#f56c6c" },
      { label: "蓝", value: "#409eff" },
      { label: "绿", value: "#67c23a" },
      { label: "黄", value: "#e6a23c" },
      { label: "紫", value: "#9c27b0" },
    ],
  },
);

// 和插件共用同一个 useState key，响应式打通
const primaryColor = useState<string>("CUSTOM-PRIMARY-COLOR-KEY");

// 上一次主题色（插件 watch 自动维护）
const prevColor = useState<string | null>("CUSTOM-PRIMARY-COLOR-PREV-KEY");

// 主题色切换：临时启用全局过渡，切换完成后移除
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
watch(primaryColor, () => {
  if (import.meta.client) {
    const root = document.documentElement;
    root.classList.add("theme-transitioning");
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove("theme-transitioning");
    }, 420);
  }
});

import { useDark } from "@vueuse/core";

// Dark/Light 切换（和插件完全解耦）
const isDark = useDark({
  storageKey: "color-scheme",
  selector: "html",
  attribute: "class",
  valueDark: "dark",
  valueLight: "",
});
</script>

<style scoped lang="scss">
.color-picker-container {
  padding: 0.75rem;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 0.5rem;
  box-shadow: 0 0.25rem 1rem rgba(0, 0, 0, 0.12);

  .color-preset {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;
    margin: 0.75rem 0;
  }

  .color-item {
    width: 100%;
    aspect-ratio: 1 / 1;
    border: 2px solid var(--el-border-color-extra-light);
    border-radius: 0.375rem;
    cursor: pointer;
    transition: transform 0.2s ease-in-out;

    &:hover {
      transform: scale(1.15);
    }

    &.active {
      transform: scale(1.2);
      border-color: var(--el-color-primary);
    }
  }

  .color-text {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: var(--kk-font-size-small);
    color: var(--el-text-color-secondary);
  }

  .color-prev {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    .prev-swatch {
      width: 1rem;
      aspect-ratio: 1 / 1;
      border-radius: 0.25rem;
      border: 1px solid var(--el-border-color-lighter);
    }

    .prev-label {
      font-size: var(--kk-font-size-small);
      color: var(--el-text-color-regular);
    }
  }
}
</style>
