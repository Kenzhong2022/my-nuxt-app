<!-- app.vue -->
<template>
  <div>
    <!-- 页面内容 -->
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>

    <!-- 过场动画覆盖层 -->
    <Transition name="overlay-fade">
      <div v-if="isPlaying" class="transition-overlay">
        <div class="slide-container">
          <div class="slide-block" style="background: #3b82f6" />
          <div class="slide-block" style="background: #ef4444" />
          <div class="slide-block" style="background: #10b981" />
          <div class="slide-block" style="background: #f59e0b" />
          <!-- 加载 -->
          <div class="loading-block">
            <div class="loading-block-after"></div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import gsap from "gsap";
import { computed } from "vue";

const loadingStore = useLoadingStore();
const isPlaying = computed(() => loadingStore.isFullLoading);
const nuxtApp = useNuxtApp();

let tl = null;

watch(isPlaying, async (playing) => {
  if (!playing) {
    if (tl) {
      tl.kill();
      tl = null;
    }
    return;
  }
  await nextTick();
  gsap.set(".slide-block", { y: 0 });
  tl = gsap.timeline(); // 不再需要 repeat:-1
  tl.to(".slide-block", {
    y: -100,
    stagger: 0.12,
    duration: 0.6,
    opacity: 1,
    ease: "power2.out",
    yoyo: true,
    repeat: -1, // 每个元素独立无限往复
  });
  tl.to(
    ".loading-block-after",
    {
      left: "calc(100% - 50px)",
      width: "100px",
      duration: 0.6,
      ease: "power2.inOut",
      yoyo: true,
      repeat: -1,
    },
    "+=0",
  );
});

// 页面加载完成后，关闭加载状态
nuxtApp.hook("page:finish", () => {
  console.log("页面加载完成");
  loadingStore.setLoading(false);
});

onMounted(() => {
  loadingStore.setLoading(true);

  setTimeout(() => {
    loadingStore.setLoading(false);
  }, 2000);
});
</script>

<style lang="scss">
:deep(.iconfont) {
  font-family: "iconfont" !important;
}
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 8px;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.45);
}

/* ---------- 过场动画相关样式 ---------- */
.transition-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  overflow: hidden;
  background: var(--el-bg-color-overlay);
}
.slide-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 20px;
  .loading-block {
    position: absolute;
    bottom: -10px;
    width: 100%;
    height: 4px;
    border-radius: 2px;
    overflow: hidden;
    background: var(--el-bg-color-page);
    .loading-block-after {
      position: absolute;
      top: 0;
      left: -50px;
      width: 100px;
      height: inherit;
      border-radius: inherit;
      background: var(--el-color-primary);
    }
  }
}
.slide-block {
  height: 100px;
  width: 100px;
  opacity: 0;
}

@media (max-width: 768px) {
  .slide-block {
    height: 50px;
    width: 50px;
  }
}

/* 覆盖层本身的淡入淡出（让出现/消失更柔和） */
.overlay-fade-enter-active {
  transition: opacity 0.15s;
}
.overlay-fade-leave-active {
  transition: opacity 0.3s;
}
.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}
</style>
