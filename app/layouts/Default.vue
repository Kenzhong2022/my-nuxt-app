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
/* el-main 的 EP 默认样式是 overflow: auto——即使它从不滚动，也会成为子孙
   position: sticky 的吸附参照（sticky 绑定最近的 overflow≠visible 祖先），
   必须改回 visible 让滚动口回到 window，BaseTable 分页吸底才生效 */
.el-main {
  overflow: visible;
  /* flex 子项默认 min-width:auto，会被表格 min-width 合计（1580px）撑宽，
     导致内容溢出到 window 横向滚动、el-table 固定列失效；
     置 0 让 main 收缩到可视宽度，横向滚动交还给表格内部滚动条 */
  min-width: 0;
}

/* 注意：也不能在此布局任何祖先上设 overflow: hidden/auto/scroll，同理 */

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
