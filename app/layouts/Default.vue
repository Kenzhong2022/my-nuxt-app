<template>
  <div class="default-layout isolate">
    <ThemeColorPicker v-if="showColorPicker" class="fixed z-[1] top-[calc(10%+4rem+0.5rem)] right-4 w-64" />
    <el-container class="h-screen">
      <!-- 头部导航：文字不能换行 -->
      <el-header class="border-b">
        <div class="header-inner">
          <h1>管理后台</h1>
          <el-switch
            class="switchDark"
            :model-value="isDark"
            @update:model-value="(newVal) => (isDark = newVal as boolean)"
            size="large"
          >
            <template #active-action>
              <!-- 月亮 → 灰色填充 -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path
                  fill="#9ca3af"
                  d="M28.053 4.41c-5.47 1.427-9.508 6.4-9.508 12.317 0 7.03 5.699 12.727 12.728 12.727 5.916 0 10.89-4.037 12.316-9.507.27 1.309.411 2.665.411 4.053 0 11.046-8.954 20-20 20S4 35.046 4 24 12.954 4 24 4c1.389 0 2.744.141 4.053.41Z"
                />
              </svg>
            </template>
            <template #inactive-action>
              <!-- 太阳 → 黄色填充 -->
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path fill="#f59e0b" d="M24 37c7.18 0 13-5.82 13-13s-5.82-13-13-13-13 5.82-13 13 5.82 13 13 13Z" />
                <path
                  fill="#f59e0b"
                  d="M24 6a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM38.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM44.5 26.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM38.5 41a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM24 47a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.5 41a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 26.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM9.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
                />
              </svg>
            </template>
          </el-switch>
          <el-button class="mobile-menu-btn" icon="Menu" @click="toggleMobileMenu"></el-button>
          <div class="ml-auto login-btn flex items-center justify-center gap-2">
            <div class="theme-btn iconfont icon-yanse-zhutise" @click="showColorPicker = !showColorPicker"></div>
            <el-button v-if="!isLoggedIn" type="primary" @click="handleLogin"> 登录 </el-button>
            <el-button v-else type="danger" @click="handleLogout"> 退出登录 </el-button>
          </div>
        </div>
      </el-header>
      <el-container>
        <div class="mobile-overlay" :class="{ active: showMobileMenu }" @click="showMobileMenu = false"></div>
        <el-aside
          width="240px"
          class="border-r"
          :class="{
            'mobile-menu-visible': showMobileMenu,
          }"
        >
          <AppMenu
            :menu-data="sortedMenu"
            :default-active="activeMenu"
            :default-openeds="defaultOpeneds"
            @menu-click="handleMenuClick"
          />
        </el-aside>
        <el-main>
          <div class="mx-auto h-full relative z-0 max-w-[100%]">
            <slot />
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import type { MenuItem } from '~~/app/components/AppMenu.vue';

const showColorPicker = ref(false);

// isLoggedIn 为响应式 ref，登录/登出后模板自动更新
const { isLoggedIn, login, logout: authLogout } = useAuth();
function handleLogin(): void {
  login();
}

function handleLogout(): void {
  authLogout();
}

/**
 * 暗黑模式共享状态（useThemeDark，cookie 持久化）：
 * SSR 阶段服务端随请求 cookie 即知 light/dark，首屏 HTML 直接带正确的 dark 类，
 * 避免主题闪烁与水合不一致
 */
const isDark = useThemeDark();

// <html> 的 dark 类由 useHead 统一管理：服务端渲染输出 + 客户端切换时响应式更新
useHead({
  htmlAttrs: {
    class: computed(() => (isDark.value ? 'dark' : '')),
  },
});

onUnmounted(() => {});

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
const { logRegisteredRoutes, syncRoutesToServer } = useRoutesDebug();

// dev 下自动上报路由同步菜单（补建/补名）；非管理员或异常时静默忽略
onBeforeMount(() => {
  logRegisteredRoutes();
  if (import.meta.dev) {
    syncRoutesToServer().catch(() => {});
  }
});

function sortMenu(items: MenuItem[]): MenuItem[] {
  return [...items]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((item) => (item.children ? { ...item, children: sortMenu(item.children) } : item));
}

const sortedMenu = computed(() => sortMenu(menuConfig.value));

function handleMenuClick(item: { path: string; name: string }) {
  navigateTo(item.path);
}

const showMobileMenu = ref(false);
function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
}
</script>

<style scoped lang="scss">
:deep(.switchDark .el-switch__action) {
  background: transparent !important;
}

.el-container {
  overflow: hidden;
}

/* 头部导航内容行：等价于 flex items-center justify-between h-full gap-4 whitespace-nowrap overflow-hidden */
.el-header {
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    gap: 1rem;
    white-space: nowrap;
    overflow: hidden;
  }
}

.theme-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 3rem;
  color: var(--el-color-primary);
}

.hidden-aside {
  display: none;
}

@media (max-width: 768px) {
  .hidden-aside {
    display: block;
  }
  .el-header {
    padding: 0 0.75rem;
  }
  .el-header .text-xl {
    font-size: 1rem;
  }
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }
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
  .mobile-menu-btn {
    display: none;
  }
  .mobile-overlay {
    display: none;
  }
}
</style>
