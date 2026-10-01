<template>
  <el-aside
    width="240px"
    class="border-r"
    :class="{
      'mobile-menu-visible': mobileVisible,
    }"
  >
    <AppMenu
      :menu-data="sortedMenu"
      :default-active="activeMenu"
      :default-openeds="defaultOpeneds"
      @menu-click="handleMenuClick"
    />
  </el-aside>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { MenuItem } from '~/components/AppMenu.vue';

// 移动端抽屉显隐由布局层统一管理（头部按钮开、遮罩点击关），此处仅消费
defineProps<{
  mobileVisible: boolean;
}>();

const route = useRoute();
const activeMenu = ref(route.path);
watch(
  () => route.path,
  (newVal) => {
    activeMenu.value = newVal;
  },
);
/**
 * 菜单祖先链索引：叶子 path → 全部祖先 path 数组
 * menuConfig 来自 useMenuConfig（DB 驱动），索引仅构建一次（O(n)），路由切换时查找 O(1)
 */
const menuAncestorsMap = computed(() => {
  const map = new Map<string, string[]>();
  /**
   * 深度优先遍历建索引
   * @param items 当前层菜单
   * @param trail 已走过的父级 path 链
   */
  function walk(items: MenuItem[], trail: string[]) {
    for (const item of items) {
      if (item.children?.length) {
        walk(item.children, [...trail, item.path]);
      } else {
        map.set(item.path, trail);
      }
    }
  }
  walk(menuConfig.value, []);
  return map;
});

/**
 * 计算默认打开的菜单：O(1) 哈希查找当前路由的全部祖先 path
 * @returns {string[]} 祖先菜单 path 数组，无匹配返回空数组
 */
const defaultOpeneds = computed(() => menuAncestorsMap.value.get(route.path) ?? []);

// 菜单路由配置：app.vue 首次进入（SSR callOnce）时经 userInfoStore.getRouters 拉取，
// useMenuConfig 负责 RuoYi 路由树 → 菜单树转换，此处仅消费转换结果 menuConfig
const { menuConfig } = useMenuConfig();

function sortMenu(items: MenuItem[]): MenuItem[] {
  return [...items]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((item) => (item.children ? { ...item, children: sortMenu(item.children) } : item));
}

const sortedMenu = computed(() => sortMenu(menuConfig.value));

function handleMenuClick(item: { path: string; name: string }) {
  navigateTo(item.path);
}
</script>

<style scoped lang="scss">
@media (max-width: 768px) {
  .el-aside {
    position: fixed;
    left: 0;
    top: 3.75rem;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    background: var(--el-bg-color);
    box-shadow: 0.125rem 0 0.5rem rgba(0, 0, 0, 0.1);
  }
  .el-aside.mobile-menu-visible {
    transform: translateX(0);
  }
}
</style>
