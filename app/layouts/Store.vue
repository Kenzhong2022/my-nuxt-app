<template>
  <div class="min-h-screen flex flex-col bg-[var(--el-bg-color-overlay)]">
    <HomeButton />
    <!-- 顶部栏 -->
    <el-header class="border-b !h-16">
      <div
        class="flex items-center justify-between h-full max-w-5xl mx-auto px-4"
      >
        <div class="text-xl font-bold cursor-pointer" @click="goHome">
          我的商城
        </div>

        <!-- 电脑导航 -->
        <div class="hidden md:flex items-center gap-8">
          <span class="cursor-pointer hover:text-blue-500" @click="goHome"
            >首页</span
          >
          <span class="cursor-pointer hover:text-blue-500">商品分类</span>
          <span class="cursor-pointer hover:text-blue-500">新品上市</span>
          <span class="cursor-pointer hover:text-blue-500">优惠活动</span>
        </div>

        <!-- 手机菜单按钮 -->
        <el-button class="md:hidden" circle @click="drawerVisible = true">
          <el-icon><Menu /></el-icon>
        </el-button>
        <div class="flex items-center gap-4">
          <el-badge :value="cart.totalCount" :hidden="cart.isEmpty" :max="99">
            <el-button
              circle
              class="cursor-pointer"
              aria-label="购物车"
              @click="goCart"
            >
              <div class="iconfont icon-cart-empty"></div>
            </el-button>
          </el-badge>
          <el-button circle class="cursor-pointer" @click="goUser">
            <div class="iconfont icon-yonghu"></div>
          </el-button>
        </div>
      </div>
    </el-header>

    <!-- 手机抽屉 -->
    <el-drawer v-model="drawerVisible" title="菜单" direction="rtl" size="60%">
      <div class="flex flex-col gap-4">
        <span class="cursor-pointer text-lg py-3 border-b">首页</span>
        <span class="cursor-pointer text-lg py-3 border-b">商品分类</span>
        <span class="cursor-pointer text-lg py-3 border-b">新品上市</span>
        <span class="cursor-pointer text-lg py-3 border-b">优惠活动</span>
      </div>
    </el-drawer>

    <!-- 搜索栏 -->
    <SearchBar
      @search="onSearch"
      :options="[
        { label: '商品', value: 'product' },
        { label: '店铺', value: 'store' },
      ]"
      placeholderTemplate="搜索{type}..."
    />

    <!-- 主内容 -->
    <el-main class="flex-1">
      <div class="max-w-5xl mx-auto">
        <slot />
      </div>
    </el-main>

    <!-- 底部 -->
    <footer class="border-t py-8 md:py-12 px-4">
      <div class="max-w-5xl mx-auto">
        <el-row :gutter="32">
          <el-col :xs="24" :sm="12" :md="6" class="mb-6 md:mb-0">
            <h4 class="text-lg font-bold mb-4">关于我们</h4>
            <div class="text-sm space-y-2 text-gray-600">
              <p class="cursor-pointer hover:text-blue-500">公司介绍</p>
              <p class="cursor-pointer hover:text-blue-500">联系我们</p>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" class="mb-6 md:mb-0">
            <h4 class="text-lg font-bold mb-4">帮助中心</h4>
            <div class="text-sm space-y-2 text-gray-600">
              <p class="cursor-pointer hover:text-blue-500">购物指南</p>
              <p class="cursor-pointer hover:text-blue-500">售后服务</p>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6" class="mb-6 md:mb-0">
            <h4 class="text-lg font-bold mb-4">服务支持</h4>
            <div class="text-sm space-y-2 text-gray-600">
              <p class="cursor-pointer hover:text-blue-500">配送说明</p>
              <p class="cursor-pointer hover:text-blue-500">支付方式</p>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12" :md="6">
            <h4 class="text-lg font-bold mb-4">关注我们</h4>
            <div class="text-sm space-y-2 text-gray-600">
              <p class="cursor-pointer hover:text-blue-500">微信公众号</p>
              <p class="cursor-pointer hover:text-blue-500">新浪微博</p>
            </div>
          </el-col>
        </el-row>
        <div
          class="text-center text-xs mt-8 md:mt-12 pt-6 border-t text-gray-400"
        >
          © 2024 我的商城. All rights reserved.
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { navigateTo } from "nuxt/app";
import HomeButton from "@/components/HomeButton.vue";

const drawerVisible = ref(false);

const cart = useCartStore();

function goCart() {
  navigateTo("/store/cart");
}

function goHome() {
  navigateTo("/store");
}

function goUser() {
  const redirect = encodeURIComponent(window.location.href); // 编码当前页面URL，防止特殊字符导致的错误
  window.location.href = `${process.env.LOGIN_BASE}/login?redirect=${redirect}`;
}

function onSearch({ query, mode }: { query: string; mode: string }) {
  console.log(query, mode);
  ElMessage.warning("功能暂未开放");
}
</script>
