<template>
  <div class="default-layout isolate">
      <!-- 头部导航：主题选择器 / 暗黑开关 / 角色信息 / 登录态（自包含组件） -->
      <LayoutHeader @toggle-mobile-menu="showMobileMenu = !showMobileMenu" />
      <el-container>
        <!-- 移动端侧边栏遮罩：点击关闭抽屉 -->
        <div class="mobile-overlay" :class="{ active: showMobileMenu }" @click="showMobileMenu = false"></div>
        <!-- 侧边栏菜单：菜单数据转换 / 排序 / 高亮（自包含组件），抽屉显隐由布局层传入 -->
        <LayoutSider :mobile-visible="showMobileMenu" />
        <el-main>
          <div class="mx-auto h-full relative z-0 max-w-[100%]">
            <slot />
          </div>
        </el-main>
      </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

// 移动端抽屉开关：头部按钮切换开、遮罩点击关
const showMobileMenu = ref(false);

const { logRegisteredRoutes, saveRoutesToSession } = useRoutesDebug();

// dev 下将当前路由表存入 sessionStorage（key: routes_debug）供本地调试排查
onBeforeMount(() => {
  logRegisteredRoutes();
  if (import.meta.dev) {
    saveRoutesToSession();
  }
});
</script>

<style scoped lang="scss">
.el-container {
  overflow: hidden;
}

@media (max-width: 768px) {
  .el-main {
    padding: 0.75rem;
  }
  .mobile-overlay {
    position: fixed;
    top: 3.75rem;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
    display: none;
  }
  .mobile-overlay.active {
    display: block;
  }
}

@media (min-width: 769px) {
  .mobile-overlay {
    display: none;
  }
}
</style>
