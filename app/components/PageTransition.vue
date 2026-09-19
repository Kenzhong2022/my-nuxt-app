<!-- components/PageLoader.vue -->
<template>
  <div v-show="showOverlay" class="page-loader" :class="fullscreen ? 'full' : 'local'">
    <div class="loader-scene">
      <div class="bounce-block" style="background: #3b82f6" />
      <div class="bounce-block" style="background: #ef4444" />
      <div class="bounce-block" style="background: #10b981" />
      <div class="bounce-block" style="background: #f59e0b" />
      <div class="progress-track">
        <div class="progress-bar"></div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{
  fullscreen: boolean;
  loading: boolean;
}>();

const showOverlay = ref(props.loading);

watch(
  () => props.loading,
  (val) => {
    if (import.meta.dev) {
      console.log('[PageLoader] loading 变化:', val, '| isClient:', import.meta.client);
    }
    showOverlay.value = val;
  },
  { immediate: true },
);

defineExpose({
  close: () => {
    showOverlay.value = false;
  },
  play: () => {
    showOverlay.value = true;
  },
});
</script>
<style lang="scss" scoped>
// —— 工具 mixin：为前 $count 个子元素依次设置 animation-delay = $step × (索引 - 1) ——
// $step 既可以传 SCSS 值（如 0.08s），也可以传 CSS 变量（如 var(--stagger-step)）
@mixin stagger-children($count, $step) {
  @for $i from 1 through $count {
    &:nth-child(#{$i}) {
      animation-delay: calc(#{$step} * #{$i - 1});
    }
  }
}

.page-loader {
  position: absolute;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px); /* Safari */

  &.full {
    position: fixed;
    width: 100vw;
    height: 100vh;
  }
  &.local {
    width: 100%;
    height: 100%;
  }

  .loader-scene {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 20px;

    .progress-track {
      position: absolute;
      bottom: -10px;
      width: 100%;
      height: 4px;
      border-radius: 2px;
      overflow: hidden;
      background: var(--el-bg-color-page);

      .progress-bar {
        position: absolute;
        top: 0;
        left: -50px;
        width: 100px;
        height: inherit;
        border-radius: inherit;
        background: var(--el-color-primary);
        animation: progress-slide 0.5s ease-in-out infinite alternate;
      }
    }
  }

  .bounce-block {
    /* ===== 可调参数 ===== */
    --bounce-duration: 0.5s; /* 单程时长：上抛 0.5s + 落下 0.5s（一个完整周期 1s） */
    --bounce-height: -100px; /* 上抛高度 */
    --stagger-step: 0.08s; /* 相邻色块错开的时间 */

    height: 100px;
    width: 100px;
    opacity: 0;
    animation: block-bounce var(--bounce-duration) ease-out infinite alternate;

    /* stagger：一行搞定，色块数量变化只改第一个参数 */
    @include stagger-children(4, var(--stagger-step));
  }

  @media (max-width: 768px) {
    .bounce-block {
      height: 50px;
      width: 50px;
      --bounce-height: -50px;
    }
  }
}

@keyframes block-bounce {
  from {
    transform: translateY(0);
    opacity: 0;
  }
  to {
    transform: translateY(var(--bounce-height, -100px));
    opacity: 1;
  }
}

@keyframes progress-slide {
  from {
    left: -50px;
  }
  to {
    left: calc(100% - 50px);
  }
}
</style>
