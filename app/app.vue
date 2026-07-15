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

let currentAnim = null;

watch(isPlaying, async (playing) => {
  if (!playing) {
    if (currentAnim) {
      currentAnim.kill();
      currentAnim = null;
    }
    return;
  }
  await nextTick();
  gsap.set(".slide-block", { y: 0 });
  currentAnim = gsap.timeline({ repeat: -1, yoyo: true });
  currentAnim.to(".slide-block", {
    y: -100,
    stagger: 0.12,
    duration: 0.6,
    ease: "power2.inOut",
  });
});

nuxtApp.hook("page:finish", () => {
  loadingStore.setLoading(false);
});

onMounted(() => {
  loadingStore.setLoading(true);
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
  background: #fff;
}
.slide-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}
.slide-block {
  height: 100px;
  width: 100px;
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
