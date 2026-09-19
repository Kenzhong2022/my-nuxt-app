<template>
  <div class="app-container">
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
    <NuxtLayout>
      <KeepAlive>
        <NuxtPage />
      </KeepAlive>
    </NuxtLayout>
    <PageTransition :is-full-screen="isFullScreenTransition" :loading="loading" />
  </div>
</template>
<script setup>
import { useRouter, useNuxtApp } from 'nuxt/app';
import { ref } from 'vue';
const router = useRouter();
const nuxtApp = useNuxtApp();
const isFullScreenTransition = ref(true);
// 初始为 true：SSR 首屏即渲染全屏遮罩（启动加载），page:finish 后关闭
const loading = ref(true);

// ---------- 用户信息（RuoYi 规范：getInfo + getRouters）SSR 拉取 ----------
const userInfoStore = useUserInfoStore();
const permissionStore = usePermissionStore();
await callOnce('user-info', async () => {
  await Promise.all([userInfoStore.getInfo(), userInfoStore.getRouters(), permissionStore.fetchAllPermissions()]);
  if (userInfoStore.user) {
    permissionStore.setPermissions(userInfoStore.permissions);
    if (userInfoStore.roles.includes('guest')) {
      console.log('[app.vue] 当前为游客模式，权限来自角色表 guest 角色');
    }
  }
  console.log(`[app.vue] 角色: [${userInfoStore.roles.join(', ') || '无'}]`);
  console.log('[app.vue] 可访问菜单:', userInfoStore.routers.map((r) => r.path).join('、') || '无');
});

router.beforeEach((to, from) => {
  loading.value = true;
  if (!from) {
    // 首页
    console.log('【首页】');
    isFullScreenTransition.value = true;
    return true;
  }
  const oldLayout = from?.meta?.layout;
  const newLayout = to?.meta?.layout;
  if (oldLayout === undefined || newLayout === undefined || oldLayout !== newLayout) {
    console.log('【全局过渡】');
    isFullScreenTransition.value = true;
  } else {
    console.log('【局部过渡】');
    isFullScreenTransition.value = false;
  }
  return true;
});

nuxtApp.hook('page:finish', (page) => {
  console.log('===== 路由跳转【完成】页面DOM与数据加载完毕 =====');
  console.log('当前页面路由meta：', page?.route?.meta);
  // 仅客户端关闭：服务端若关闭会导致 SSR HTML 不含遮罩，且与客户端 hydration 不一致
  if (import.meta.client) {
    loading.value = false;
  }
});
</script>
<style lang="scss">
.app-container {
  position: relative;
}
.container-scroll {
  --el-main-padding: 40px;
  height: calc(100vh - 60px - var(--el-main-padding));
  overflow: auto;
}
.iconfont {
  font-family: 'iconfont' !important;
}
</style>
