<template>
  <!-- 开场动画遮罩 -->
  <div class="flex-animation">
    <div v-for="idx in 50" :key="idx">
      <div class="inner-bg"></div>
    </div>
  </div>

  <el-container class="h-screen">
    <!-- 头部导航：文字不能换行 -->
    <el-header class="border-b">
      <div
        class="flex items-center justify-between h-full gap-4 whitespace-nowrap overflow-hidden"
      >
        <h1>管理后台</h1>
        <ClientOnly>
          <el-switch
            :model-value="isDark"
            @update:model-value="(newVal) => (isDark = newVal as boolean)"
            active-text="暗黑"
            inactive-text="明亮"
          />
          <el-switch
            :model-value="isSidebarMenu"
            @update:model-value="
              (newVal) => (isSidebarMenu = newVal as boolean)
            "
            active-text="侧边栏"
            inactive-text="头部"
          />
        </ClientOnly>
        <div class="ml-auto">
          <el-button v-if="!isLoggedIn" type="primary" @click="handleLogin">
            登录
          </el-button>
          <el-button v-else type="danger" @click="handleLogout">
            退出登录
          </el-button>
        </div>

        <div class="desktop-menu" v-show="isClient && !isSidebarMenu">
          <AppMenu
            :menu-data="sortedMenu"
            :default-active="activeMenu"
            mode="horizontal"
            @menu-click="handleMenuClick"
          >
            <template #submenu-title="{ menu }">
              <el-icon>
                <component :is="menu.icon" />
              </el-icon>
              {{ menu.name }}
            </template>
          </AppMenu>
        </div>
        <el-button
          class="mobile-menu-btn"
          icon="Menu"
          @click="toggleMobileMenu"
        ></el-button>
      </div>
    </el-header>
    <el-container>
      <div
        class="mobile-overlay"
        :class="{ active: showMobileMenu }"
        @click="showMobileMenu = false"
      ></div>
      <el-aside
        v-show="isClient && isSidebarMenu"
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
          mode="vertical"
          @menu-click="handleMenuClick"
        />
      </el-aside>
      <el-main>
        <div class="mx-auto h-full">
          <slot />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Ref } from "vue";
import { ElMessage } from "element-plus";
import gsap from "gsap";
import { useDark, useStorage } from "@vueuse/core";
import type { MenuItem } from "~~/app/components/AppMenu.vue";

const isClient = ref(false);

const { isLoggedIn, login, logout: authLogout } = useAuth();

function handleLogin(): void {
  login();
}

function handleLogout(): void {
  authLogout();
}

let isDark: Ref<boolean> = ref(false);
let isSidebarMenu: Ref<boolean | undefined> = ref();
isDark = useDark({
  storageKey: "color-scheme", // ✅ 独立的 key，只存 dark/light
  selector: "html",
  attribute: "class", // 通过 class="dark" 切换
  valueDark: "dark",
  valueLight: "",
});
onMounted(() => {
  rotateYOpen();
  isClient.value = true;
  isSidebarMenu = useStorage("admin-menu-mode", true);
});

onUnmounted(() => {
  console.log("组件卸载时执行");
});

// 方块横向收拢动画
function rotateYOpen() {
  const tl = gsap.timeline();
  tl.to(".flex-animation", {
    display: "flex",
  });
  tl.to(".inner-bg", {
    scaleX: 0,
    transformOrigin: "center center",
    opacity: 0,
    duration: 1.3,
    stagger: 0.015,
    ease: "power2.out",
  });
  tl.to(".flex-animation", { opacity: 0, duration: 1 }, ">-2");
}

const route = useRoute();
const activeMenu = ref(route.path);
watch(
  () => route.path,
  (newVal) => {
    activeMenu.value = newVal;
  },
);
/**
 * 计算默认打开的菜单
 * @returns {string[]} 包含父菜单路径的数组，如果当前路由是子菜单则返回父菜单路径，否则返回空数组
 */
const defaultOpeneds = computed(() => {
  const parent = menuConfig.value.find((m) =>
    m.children?.some((c) => c.path === route.path),
  );
  return parent ? [parent.path] : [];
});

const menuConfig = ref<MenuItem[]>([
  {
    id: 0,
    parentId: 0,
    name: "Dashboard",
    icon: "Histogram",
    path: "/dashboard",
    sort: 0,
  },
  {
    id: 1,
    parentId: 0,
    name: "我的项目",
    icon: "FolderOpened",
    path: "/myProjects",
    sort: 1,
  },
  {
    id: 2,
    parentId: 0,
    name: "商品管理",
    icon: "Goods",
    path: "/goods",
    sort: 2,
    children: [
      { id: 21, parentId: 2, name: "商品列表", path: "/goods/list", sort: 0 },
      {
        id: 22,
        parentId: 2,
        name: "商品分类",
        path: "/goods/category",
        sort: 1,
      },
      { id: 23, parentId: 2, name: "品牌管理", path: "/goods/brand", sort: 2 },
      {
        id: 24,
        parentId: 2,
        name: "规格属性管理",
        path: "/goods/attr",
        sort: 3,
      },
      { id: 25, parentId: 2, name: "库存管理", path: "/goods/stock", sort: 4 },
      { id: 26, parentId: 2, name: "素材图库", path: "/goods/image", sort: 5 },
    ],
  },
  {
    id: 3,
    parentId: 0,
    name: "订单管理",
    icon: "order",
    path: "/order",
    sort: 3,
    children: [
      { id: 31, parentId: 3, name: "全部订单", path: "/order/all", sort: 0 },
      {
        id: 32,
        parentId: 3,
        name: "待付款订单",
        path: "/order/unpay",
        sort: 1,
      },
      {
        id: 33,
        parentId: 3,
        name: "待发货订单",
        path: "/order/unship",
        sort: 2,
      },
      {
        id: 34,
        parentId: 3,
        name: "已完成/已取消订单",
        path: "/order/finish",
        sort: 3,
      },
      {
        id: 35,
        parentId: 3,
        name: "售后管理",
        path: "/order/aftersale",
        sort: 4,
      },
      {
        id: 36,
        parentId: 3,
        name: "物流运费配置",
        path: "/order/express",
        sort: 5,
      },
    ],
  },
  {
    id: 4,
    parentId: 0,
    name: "商城会员",
    icon: "User",
    path: "/member",
    sort: 4,
    children: [
      { id: 41, parentId: 4, name: "会员列表", path: "/member/list", sort: 0 },
      { id: 42, parentId: 4, name: "会员标签", path: "/member/tag", sort: 1 },
      {
        id: 43,
        parentId: 4,
        name: "会员等级配置",
        path: "/member/level",
        sort: 2,
      },
      {
        id: 44,
        parentId: 4,
        name: "账户流水明细",
        path: "/member/account",
        sort: 3,
      },
    ],
  },
  {
    id: 5,
    parentId: 0,
    name: "营销活动",
    icon: "ShoppingBag",
    path: "/promo",
    sort: 5,
    children: [
      {
        id: 51,
        parentId: 5,
        name: "优惠券管理",
        path: "/promo/coupon",
        sort: 0,
      },
      {
        id: 52,
        parentId: 5,
        name: "限时秒杀",
        path: "/promo/seckill",
        sort: 1,
      },
      { id: 53, parentId: 5, name: "拼团活动", path: "/promo/group", sort: 2 },
      {
        id: 54,
        parentId: 5,
        name: "全店满减",
        path: "/promo/fullcut",
        sort: 3,
      },
      {
        id: 55,
        parentId: 5,
        name: "首页广告配置",
        path: "/promo/banner",
        sort: 4,
      },
    ],
  },
  {
    id: 6,
    parentId: 0,
    name: "财务管理",
    icon: "Money",
    path: "/finance",
    sort: 6,
    children: [
      { id: 61, parentId: 6, name: "资金流水", path: "/finance/log", sort: 0 },
      {
        id: 62,
        parentId: 6,
        name: "订单对账报表",
        path: "/finance/check",
        sort: 1,
      },
      {
        id: 63,
        parentId: 6,
        name: "退款账单",
        path: "/finance/refund",
        sort: 2,
      },
      {
        id: 64,
        parentId: 6,
        name: "支付渠道配置",
        path: "/finance/payconfig",
        sort: 3,
      },
    ],
  },
  {
    id: 7,
    parentId: 0,
    name: "数据统计",
    icon: "TrendCharts",
    path: "/stats",
    sort: 7,
    children: [
      {
        id: 71,
        parentId: 7,
        name: "运营概览看板",
        path: "/stats/dashboard",
        sort: 0,
      },
      {
        id: 72,
        parentId: 7,
        name: "商品数据分析",
        path: "/stats/goods",
        sort: 1,
      },
      {
        id: 73,
        parentId: 7,
        name: "订单统计报表",
        path: "/stats/order",
        sort: 2,
      },
      {
        id: 74,
        parentId: 7,
        name: "用户数据分析",
        path: "/stats/user",
        sort: 3,
      },
    ],
  },
  {
    id: 8,
    parentId: 0,
    name: "系统权限",
    icon: "Key",
    path: "/system",
    sort: 8,
    children: [
      { id: 81, parentId: 8, name: "角色管理", path: "/system/role", sort: 1 },
      {
        id: 82,
        parentId: 8,
        name: "用户管理",
        path: "/system/user",
        sort: 2,
      },
      { id: 83, parentId: 8, name: "系统日志", path: "/system/log", sort: 3 },
    ],
  },
  {
    id: 9,
    parentId: 0,
    name: "问卷工坊",
    icon: "Document",
    path: "/survey",
    sort: 9,
    children: [
      { id: 91, parentId: 9, name: "问卷列表", path: "/survey/list", sort: 0 },
      {
        id: 92,
        parentId: 9,
        name: "创建问卷",
        path: "/survey/create",
        sort: 1,
      },
      {
        id: 93,
        parentId: 9,
        name: "答卷数据",
        path: "/survey/record",
        sort: 2,
      },
    ],
  },
  {
    id: 10,
    parentId: 0,
    name: "Chief Agent",
    icon: "Service",
    path: "/agent",
    sort: 10,
    children: [
      { id: 101, parentId: 10, name: "智能对话", path: "/agent/chat", sort: 0 },
      {
        id: 102,
        parentId: 10,
        name: "会话记录",
        path: "/agent/history",
        sort: 1,
      },
    ],
  },
  {
    id: 11,
    parentId: 0,
    name: "Canvas",
    icon: "Monitor",
    path: "/canvas",
    sort: 11,
    children: [
      {
        id: 111,
        parentId: 11,
        name: "弹幕避让",
        path: "/canvas/cameraMattingDanmakuView",
        sort: 0,
      },
      {
        id: 112,
        parentId: 11,
        name: "Gsap 动画",
        path: "/canvas/gsap",
        sort: 1,
      },
    ],
  },
]);

function sortMenu(items: MenuItem[]): MenuItem[] {
  return [...items]
    .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
    .map((item) =>
      item.children ? { ...item, children: sortMenu(item.children) } : item,
    );
}

const sortedMenu = computed(() => sortMenu(menuConfig.value));

function handleMenuClick(item: { path: string; name: string }) {
  // 已完成功能（去重）：仅保留有对应页面文件的路径
  const completedPaths = [
    // 菜单项 - 已完成
    "/dashboard",
    "/myProjects",
    "/survey",
    "/agent",
    "/canvas",
    "/canvas/cameraMattingDanmakuView",
    "/canvas/gsap",
    "/system/role",
    "/system/user",
    "/admin/permissions",
    // 非菜单页面 - 已完成
    "/admin",
    "/store",
    "/store/cart",
    "/store/chat",
    "/CallBack",
    "/qrcode",
    "/testdynamicForm",
    "/403",
  ];
  // 检查是否已完成
  if (
    completedPaths.some(
      (path) => path === item.path || path.startsWith(item.path),
    )
  ) {
    navigateTo(item.path);
    return;
  }
  // 功能未开放
  ElMessage.warning(`功能暂未开发：${item.path}`);
}

const showMobileMenu = ref(false);
function toggleMobileMenu() {
  showMobileMenu.value = !showMobileMenu.value;
}
</script>

<style scoped lang="scss">
.flex-animation {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  z-index: 9999;
  pointer-events: none;
  & > div {
    flex: 1;
    height: 100vh;
    .inner-bg {
      width: 100%;
      height: 100%;
      background: #000;
    }
  }

  &::after {
    content: "资源加载中...";
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 6.25rem;
    color: var(--el-text-color-primary, #ccc);
    z-index: 999;
    animation: breathe 1.8s ease-in-out infinite;
  }
  @keyframes breathe {
    0% {
      opacity: 0.5;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.5;
    }
  }
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
  .desktop-menu {
    display: none;
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
