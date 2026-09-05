<!-- app.vue -->
<template>
  <!-- PWA：注入 <link rel="manifest">（模块 1.x 改为组件方式，需手动放置） -->
  <VitePwaManifest />
  <div class="app-container">
      <!-- 传入自定义水印内容 -->
  <Watermark
    v-if="0"
    text="张三｜用户ID：2026001｜内部文档，严禁截图外传"
    :font-size="14"
    color="#666666"
    :opacity="0.15"
    :rotate="-25"
    :gap-x="240"
    :gap-y="160"
  />
    <!-- 页面内容 -->
    <NuxtLayout>
      <KeepAlive>
        <NuxtPage />
      </KeepAlive>
    </NuxtLayout>
    <!-- 过场动画覆盖层 -->
    <ClientOnly>
      <div v-if="loadingStore.isRouteChanging" class="transition-overlay">
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
    </ClientOnly>
  </div>

</template>

<script setup>
import gsap from 'gsap';
import { useRegisterSW } from 'virtual:pwa-register/vue';
const loadingStore = useLoadingStore();

// ---------- 用户信息（RuoYi 规范：getInfo + getRouters）SSR 拉取 ----------
// callOnce：SSR 期间执行一次，客户端水合时跳过；
// pinia 状态随 Nuxt payload 序列化下发，v-hasPermi/v-hasRole 指令两端读到一致数据
const userInfoStore = useUserInfoStore();
await callOnce('user-info', async () => {
  await Promise.all([userInfoStore.getInfo(), userInfoStore.getRouters()]);
});

// TODO: 临时调试 —— 根组件 setup 只执行一次，此时 Nuxt 已按文件系统把 pages 全部注册进 router
const router = useRouter();
const routes = router.getRoutes();

let tl = null;

// ---------- PWA 版本更新提示（registerType: 'prompt'，见 docs/PWA.md 第五节）----------
// 新 SW 安装完成进入 waiting → needRefresh 变 true → 用户点击通知 → skipWaiting + 自动刷新
const { needRefresh, updateServiceWorker } = useRegisterSW();
watch(needRefresh, (v) => {
  // 开发模式 SW 随 HMR 频繁更新，不弹通知（生产环境才提示）
  if (!v || import.meta.dev) return;
  ElNotification({
    title: '发现新版本',
    message: '部分功能已更新，点击立即刷新生效',
    type: 'info',
    duration: 0, // 不自动关闭
    onClick: () => updateServiceWorker(true), // true = 触发 skipWaiting 并刷新页面
  });
});


watch(
  () => loadingStore.isRouteChanging,
  async (playing) => {
    if (!playing) {
      if (tl) {
        tl.kill();
        tl = null;
      }
      return;
    }
    await nextTick();
    gsap.set('.slide-block', { y: 0 });
    tl = gsap.timeline(); // 不再需要 repeat:-1
    tl.to('.slide-block', {
      y: -100,
      stagger: 0.12,
      duration: 0.6,
      opacity: 1,
      ease: 'power2.out',
      yoyo: true,
      repeat: -1, // 每个元素独立无限往复
    });
    tl.to(
      '.loading-block-after',
      {
        left: 'calc(100% - 50px)',
        width: '100px',
        duration: 0.6,
        ease: 'power2.inOut',
        yoyo: true,
        repeat: -1,
      },
      '-=0.5',
    );
  },
);
</script>

<style lang="scss">
.iconfont {
  font-family: 'iconfont' !important;
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
</style>
