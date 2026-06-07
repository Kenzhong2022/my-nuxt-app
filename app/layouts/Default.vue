<template>
  <el-container class="h-screen">
    <el-header class="border-b">
      <div class="flex items-center justify-between h-full">
        <div class="text-xl font-bold">管理后台</div>
        <el-menu
          :default-active="activeMenu"
          mode="horizontal"
          class="border-none"
        >
          <el-menu-item
            v-for="menu in menuConfig"
            :key="menu.id"
            :index="String(menu.id)"
            @click="activeMenu = String(menu.id)"
          >
            {{ menu.name }}
          </el-menu-item>
        </el-menu>
      </div>
    </el-header>
    <el-container>
      <el-aside width="240px" class="border-r">
        <el-menu
          :default-openeds="defaultOpeneds"
          class="border-none"
          mode="vertical"
        >
          <template v-for="menu in menuConfig" :key="menu.id">
            <el-sub-menu :index="String(menu.id)">
              <template #title>
                <span>{{ menu.name }}</span>
              </template>
              <el-menu-item
                v-for="child in menu.children"
                :key="child.id"
                :index="String(child.id)"
                @click="handleMenuClick(child)"
              >
                {{ child.name }}
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </el-aside>
      <el-main class="py-6">
        <div class="mx-auto">
          <slot />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, markRaw } from "vue";

const activeMenu = ref("1");
const defaultOpeneds = ref(["1"]);

// 菜单配置数据
const menuConfig = ref([
  {
    id: 1,
    parentId: 0,
    name: "商品管理",
    icon: "goods",
    path: "/goods",
    children: [
      { id: 11, parentId: 1, name: "商品列表", path: "/goods/list" },
      { id: 12, parentId: 1, name: "商品分类", path: "/goods/category" },
      { id: 13, parentId: 1, name: "品牌管理", path: "/goods/brand" },
      { id: 14, parentId: 1, name: "规格属性管理", path: "/goods/attr" },
      { id: 15, parentId: 1, name: "库存管理", path: "/goods/stock" },
      { id: 16, parentId: 1, name: "素材图库", path: "/goods/image" },
    ],
  },
  {
    id: 2,
    parentId: 0,
    name: "订单管理",
    icon: "order",
    path: "/order",
    children: [
      { id: 21, parentId: 2, name: "全部订单", path: "/order/all" },
      { id: 22, parentId: 2, name: "待付款订单", path: "/order/unpay" },
      { id: 23, parentId: 2, name: "待发货订单", path: "/order/unship" },
      { id: 24, parentId: 2, name: "已完成/已取消订单", path: "/order/finish" },
      { id: 25, parentId: 2, name: "售后管理", path: "/order/aftersale" },
      { id: 26, parentId: 2, name: "物流运费配置", path: "/order/express" },
    ],
  },
  {
    id: 3,
    parentId: 0,
    name: "用户会员",
    icon: "member",
    path: "/member",
    children: [
      { id: 31, parentId: 3, name: "用户列表", path: "/member/list" },
      { id: 32, parentId: 3, name: "用户标签", path: "/member/tag" },
      { id: 33, parentId: 3, name: "会员等级配置", path: "/member/level" },
      { id: 34, parentId: 3, name: "账户流水明细", path: "/member/account" },
    ],
  },
  {
    id: 4,
    parentId: 0,
    name: "营销活动",
    icon: "marketing",
    path: "/promo",
    children: [
      { id: 41, parentId: 4, name: "优惠券管理", path: "/promo/coupon" },
      { id: 42, parentId: 4, name: "限时秒杀", path: "/promo/seckill" },
      { id: 43, parentId: 4, name: "拼团活动", path: "/promo/group" },
      { id: 44, parentId: 4, name: "全店满减", path: "/promo/fullcut" },
      { id: 45, parentId: 4, name: "首页广告配置", path: "/promo/banner" },
    ],
  },
  {
    id: 5,
    parentId: 0,
    name: "财务管理",
    icon: "finance",
    path: "/finance",
    children: [
      { id: 51, parentId: 5, name: "资金流水", path: "/finance/log" },
      { id: 52, parentId: 5, name: "订单对账报表", path: "/finance/check" },
      { id: 53, parentId: 5, name: "退款账单", path: "/finance/refund" },
      { id: 54, parentId: 5, name: "支付渠道配置", path: "/finance/payconfig" },
    ],
  },
  {
    id: 6,
    parentId: 0,
    name: "数据统计",
    icon: "data",
    path: "/stats",
    children: [
      { id: 61, parentId: 6, name: "运营概览看板", path: "/stats/dashboard" },
      { id: 62, parentId: 6, name: "商品数据分析", path: "/stats/goods" },
      { id: 63, parentId: 6, name: "订单统计报表", path: "/stats/order" },
      { id: 64, parentId: 6, name: "用户数据分析", path: "/stats/user" },
    ],
  },
  {
    id: 7,
    parentId: 0,
    name: "系统设置",
    icon: "setting",
    path: "/system",
    children: [
      { id: 71, parentId: 7, name: "管理员账号", path: "/system/admin" },
      { id: 72, parentId: 7, name: "角色权限管理", path: "/system/role" },
      { id: 73, parentId: 7, name: "站点基础配置", path: "/system/config" },
      { id: 74, parentId: 7, name: "数据字典", path: "/system/dict" },
      { id: 75, parentId: 7, name: "系统日志", path: "/system/log" },
    ],
  },
]);

function handleMenuClick(child: { path: string }) {
  navigateTo(child.path);
}
</script>
