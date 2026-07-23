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
        <div
          class="text-xl font-bold flex items-center gap-3 whitespace-nowrap"
        >
          管理后台
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
        </div>
        <div class="desktop-menu" v-show="isClient && !isSidebarMenu">
          <AppMenu
            :menu-data="menuConfig"
            :default-active="activeMenu"
            mode="horizontal"
            @menu-click="handleMenuClick"
          >
            <template #submenu-title="{ menu }">
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
        v-show="isClient && !isSidebarMenu"
        width="240px"
        class="border-r"
        :class="{
          'mobile-menu-visible': showMobileMenu,
        }"
      >
        <AppMenu
          :menu-data="menuConfig"
          :default-active="activeMenu"
          :default-openeds="defaultOpeneds"
          mode="vertical"
          @menu-click="handleMenuClick"
        />
      </el-aside>
      <el-main>
        <div class="mx-auto">
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

const isClient = import.meta.client;

let isDark: Ref<boolean> = ref(false);
let isSidebarMenu: Ref<boolean | undefined> = ref();

if (isClient) {
  isDark = useDark({
    storageKey: "admin-dark-mode",
    selector: "html",
    valueDark: "dark",
  });
  isSidebarMenu = useStorage("admin-menu-mode", true);
}

onMounted(() => {
  rotateYOpen();
});

onUnmounted(() => {
  console.log("组件卸载时执行");
});

// 方块横向收拢动画
function rotateYOpen() {
  const tl = gsap.timeline();
  tl.set(".flex-animation", {
    display: "flex",
  })
    .to(".inner-bg", {
      scaleX: 0,
      transformOrigin: "center center",
      opacity: 0,
      duration: 1.3,
      stagger: 0.015,
      ease: "power2.out",
    })
    .set(".flex-animation", {
      display: "none",
    });
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
    icon: "dashboard",
    path: "/dashboard",
  },
  // 新增：项目展示页（第二位）
  {
    id: 1,
    parentId: 0,
    name: "项目展示",
    icon: "grid",
    path: "/projectShowcase",
  },
  // 原商品管理，id 顺延
  {
    id: 2,
    parentId: 0,
    name: "商品管理",
    icon: "goods",
    path: "/goods",
    children: [
      { id: 21, parentId: 2, name: "商品列表", path: "/goods/list" },
      { id: 22, parentId: 2, name: "商品分类", path: "/goods/category" },
      { id: 23, parentId: 2, name: "品牌管理", path: "/goods/brand" },
      { id: 24, parentId: 2, name: "规格属性管理", path: "/goods/attr" },
      { id: 25, parentId: 2, name: "库存管理", path: "/goods/stock" },
      { id: 26, parentId: 2, name: "素材图库", path: "/goods/image" },
    ],
  },
  {
    id: 3,
    parentId: 0,
    name: "订单管理",
    icon: "order",
    path: "/order",
    children: [
      { id: 31, parentId: 3, name: "全部订单", path: "/order/all" },
      { id: 32, parentId: 3, name: "待付款订单", path: "/order/unpay" },
      { id: 33, parentId: 3, name: "待发货订单", path: "/order/unship" },
      { id: 34, parentId: 3, name: "已完成/已取消订单", path: "/order/finish" },
      { id: 35, parentId: 3, name: "售后管理", path: "/order/aftersale" },
      { id: 36, parentId: 3, name: "物流运费配置", path: "/order/express" },
    ],
  },
  {
    id: 4,
    parentId: 0,
    name: "商城会员",
    icon: "member",
    path: "/member",
    children: [
      { id: 41, parentId: 4, name: "会员列表", path: "/member/list" },
      { id: 42, parentId: 4, name: "会员标签", path: "/member/tag" },
      { id: 43, parentId: 4, name: "会员等级配置", path: "/member/level" },
      { id: 44, parentId: 4, name: "账户流水明细", path: "/member/account" },
    ],
  },
  {
    id: 5,
    parentId: 0,
    name: "营销活动",
    icon: "marketing",
    path: "/promo",
    children: [
      { id: 51, parentId: 5, name: "优惠券管理", path: "/promo/coupon" },
      { id: 52, parentId: 5, name: "限时秒杀", path: "/promo/seckill" },
      { id: 53, parentId: 5, name: "拼团活动", path: "/promo/group" },
      { id: 54, parentId: 5, name: "全店满减", path: "/promo/fullcut" },
      { id: 55, parentId: 5, name: "首页广告配置", path: "/promo/banner" },
    ],
  },
  {
    id: 6,
    parentId: 0,
    name: "财务管理",
    icon: "finance",
    path: "/finance",
    children: [
      { id: 61, parentId: 6, name: "资金流水", path: "/finance/log" },
      { id: 62, parentId: 6, name: "订单对账报表", path: "/finance/check" },
      { id: 63, parentId: 6, name: "退款账单", path: "/finance/refund" },
      { id: 64, parentId: 6, name: "支付渠道配置", path: "/finance/payconfig" },
    ],
  },
  {
    id: 7,
    parentId: 0,
    name: "数据统计",
    icon: "data",
    path: "/stats",
    children: [
      { id: 71, parentId: 7, name: "运营概览看板", path: "/stats/dashboard" },
      { id: 72, parentId: 7, name: "商品数据分析", path: "/stats/goods" },
      { id: 73, parentId: 7, name: "订单统计报表", path: "/stats/order" },
      { id: 74, parentId: 7, name: "用户数据分析", path: "/stats/user" },
    ],
  },
  {
    id: 8,
    parentId: 0,
    name: "系统权限",
    icon: "setting",
    path: "/system",
    children: [
      { id: 81, parentId: 8, name: "管理员账号", path: "/system/admin" },
      { id: 82, parentId: 8, name: "角色管理", path: "/system/role" },
      { id: 83, parentId: 8, name: "站点基础配置", path: "/system/config" },
      { id: 84, parentId: 8, name: "数据字典", path: "/system/dict" },
      { id: 85, parentId: 8, name: "系统日志", path: "/system/log" },
    ],
  },
  // 问卷工坊
  {
    id: 9,
    parentId: 0,
    name: "问卷工坊",
    icon: "document",
    path: "/survey",
    children: [
      { id: 91, parentId: 9, name: "问卷列表", path: "/survey/list" },
      { id: 92, parentId: 9, name: "创建问卷", path: "/survey/create" },
      { id: 93, parentId: 9, name: "答卷数据", path: "/survey/record" },
    ],
  },
  // Chief Agent
  {
    id: 10,
    parentId: 0,
    name: "Chief Agent",
    icon: "magic-stick",
    path: "/agent",
    children: [
      { id: 101, parentId: 10, name: "智能对话", path: "/agent/chat" },
      { id: 102, parentId: 10, name: "会话记录", path: "/agent/history" },
    ],
  },
]);

function handleMenuClick(item: { path: string; name: string }) {
  // 已完成功能
  const completedPaths = [
    "/dashboard",
    "/projectShowcase",
    "/survey",
    "/agent",
  ];
  // 检查是否已完成
  if (completedPaths.includes(item.path)) {
    navigateTo(item.path);
    return;
  }
  // 功能未开放
  ElMessage.warning("功能暂未开发");
  return;
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
}

.hidden-aside {
  display: none;
}

@media (max-width: 768px) {
  .hidden-aside {
    display: block;
  }
  .el-header {
    padding: 0 12px;
  }
  .el-header .text-xl {
    font-size: 16px;
  }
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
  }
  .desktop-menu {
    display: none;
  }
  .el-aside {
    position: fixed;
    left: 0;
    top: 60px;
    bottom: 0;
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    background: var(--el-bg-color);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  }
  .el-aside.mobile-menu-visible {
    transform: translateX(0);
  }
  .el-main {
    padding: 12px;
  }
  .mobile-overlay {
    position: fixed;
    top: 60px;
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
