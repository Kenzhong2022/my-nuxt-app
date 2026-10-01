<template>
  <div class="color-picker-container" ref="rootRef">
    <h4>切换主题颜色</h4>
    <div class="color-preset">
      <div
        v-for="color in colors"
        :key="color.value"
        class="color-item"
        :class="{ active: primaryColor === color.value }"
        :style="{ backgroundColor: color.value }"
        @click="handlePick(color.value)"
      ></div>
    </div>
    <div class="color-text">
      <span>当前：{{ primaryColor }}</span>
      <!-- 不开 show-alpha：主题变量需实色，alpha 会被 toHexString 静默丢弃（选了透明却显示实色，体验困惑） -->
      <el-color-picker :model-value="primaryColor" @update:model-value="handlePick" />
    </div>
    <!-- 校验提示：清空/灰阶拒绝/无法识别（红），亮度自动校正（主色） -->
    <p v-if="tip" class="color-tip" :class="{ error: tipIsError }">{{ tip }}</p>

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
import { DEFAULT_PRIMARY_COLOR, THEME_COLOR_LIMITS, clampLightColor, hexToHsl } from '~/utils/color';

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
      { label: '红', value: '#f56c6c' },
      { label: '蓝', value: '#409eff' },
      { label: '绿', value: '#67c23a' },
      { label: '黄', value: '#e6a23c' },
      { label: '紫', value: '#9c27b0' },
    ],
  },
);

// 和插件共用同一个 useState key，响应式打通
const primaryColor = useState<string>('CUSTOM-PRIMARY-COLOR-KEY');

// 上一次主题色（插件 watch 自动维护）
const prevColor = useState<string | null>('CUSTOM-PRIMARY-COLOR-PREV-KEY');

// 校验提示文案与类型（error 红 / info 主色）
const tip = ref('');
const tipIsError = ref(false);

/**
 * 拾色器 / 预设色统一入口：清空回退、灰阶拒绝、亮度越界自动校正
 * 规则与 utils/color.ts 的主题色安全值域一致
 * @param val 新颜色（拾色器清空时为 null）
 */
function handlePick(val: string | null): void {
  tip.value = '';
  tipIsError.value = false;

  // 清空拾色器：状态未变更，:model-value 自动回弹，仅提示
  if (!val) {
    tip.value = '已清空，保持原主题色';
    tipIsError.value = true;
    return;
  }

  const hsl = hexToHsl(val);
  if (!hsl) {
    tip.value = '无法识别的颜色值';
    tipIsError.value = true;
    return;
  }

  // 灰度色系拒绝（自动提饱和会改变色相观感，参考 demo 的处理方式）
  if (hsl.s < THEME_COLOR_LIMITS.sMin) {
    tip.value = '饱和度不足，不能使用灰度色系作为主题色';
    tipIsError.value = true;
    return;
  }

  // 亮度越界：夹取到安全区间后应用
  const corrected = clampLightColor(val);
  if (corrected.toLowerCase() !== val.toLowerCase()) {
    tip.value = `亮度超出安全区间，已自动校正为 ${corrected}`;
  }
  primaryColor.value = corrected;
}

// 主题色切换：临时启用全局过渡，切换完成后移除
let transitionTimer: ReturnType<typeof setTimeout> | null = null;
watch(primaryColor, () => {
  if (import.meta.client) {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    if (transitionTimer) clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => {
      root.classList.remove('theme-transitioning');
    }, 420);
  }
});

// Dark/Light 切换：与 Default 布局共享同一份 cookie 持久化状态（SSR 可读）
const isDark = useThemeDark();

import { onClickOutside } from '@vueuse/core';

const emit = defineEmits<{ (e: 'close'): void }>();

const rootRef = ref<HTMLElement | null>(null);

onClickOutside(
  rootRef,
  (e) => {
    const target = e.target as HTMLElement | null;
    // el-color-picker 的面板和触发器被 teleport 到 body，不算"外部"
    if (target?.closest('.el-color-picker__panel') || target?.closest('.el-color-picker__trigger')) {
      return;
    }
    // 开关按钮自身不算"外部"：显隐 toggle 完全由按钮 @click 负责，
    // 否则本次点击先被判定外部关闭、再被 @click 取反重开，按钮永远无法收起面板
    if (target?.closest('.theme-btn')) {
      return;
    }
    emit('close');
  },
  // 面板本身不能被算作"内部"之外的干扰，这里只监听 click
  { detectIframe: false },
);
</script>

<style scoped lang="scss">
.color-picker-container {
  user-select: none;
  padding: 0.75rem;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 0.5rem;
  /* offset-x | offset-y | blur | spread | color */
  box-shadow: 0 0.25rem 1rem 0.3rem var(--el-color-primary);

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

  .color-tip {
    margin: 0.5rem 0 0;
    font-size: var(--kk-font-size-extra-small);
    line-height: 1.4;
    color: var(--el-color-primary);

    &.error {
      color: var(--el-color-danger);
    }
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
