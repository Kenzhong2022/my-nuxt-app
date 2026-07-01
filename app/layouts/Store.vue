<template>
  <div class="min-h-screen flex flex-col">
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
          <span class="cursor-pointer hover:text-blue-500">首页</span>
          <span class="cursor-pointer hover:text-blue-500">商品分类</span>
          <span class="cursor-pointer hover:text-blue-500">新品上市</span>
          <span class="cursor-pointer hover:text-blue-500">优惠活动</span>
        </div>

        <!-- 手机菜单按钮 -->
        <el-button class="md:hidden" circle @click="drawerVisible = true">
          菜单
        </el-button>
        <div class="flex items-center gap-4">
          <el-badge :value="cart.totalCount" :hidden="cart.isEmpty" :max="99">
            <el-button
              circle
              class="cursor-pointer"
              aria-label="购物车"
              @click="goCart"
            >
              购物车
            </el-button>
          </el-badge>
          <el-button circle class="cursor-pointer" @click="goUser"
            >用户</el-button
          >
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
      @fetchSuggestions="onFetchSuggestions"
      :options="[
        { label: '商品', value: 'product' },
        { label: '店铺', value: 'store' },
      ]"
      placeholderTemplate="搜索{type}..."
      :suggestions="searchSuggestions"
    />

    <!-- 主内容 -->
    <el-main class="flex-1 py-4 md:py-6 px-4">
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
import { ref, watch } from "vue";
import { navigateTo } from "nuxt/app";
import { ElInput, ElMessage } from "element-plus";

const drawerVisible = ref(false);

// 使用InstanceType工具类型获取组件实例类型
const searchInput = ref<InstanceType<typeof ElInput> | null>(null);

watch(
  () => searchInput.value?.input?.getBoundingClientRect().top,
  (newVal) => {
    if (newVal) {
      console.log(newVal);
    }
  },
);

// 购物车 store
const cart = useCartStore();

// 进入购物车页
function goCart() {
  navigateTo("/cart");
}

// 进入首页
function goHome() {
  navigateTo("/");
}

// 进入用户中心
function goUser() {
  // 前往认证中心，本地开发环境为http://localhost:3001/login
  const redirect = encodeURIComponent(window.location.href);
  window.location.href = `http://localhost:3001/login?redirect=${redirect}`;
}

function onSearch({ query, mode }: { query: string; mode: string }) {
  console.log(query, mode);
}
const searchSuggestions = ref<string[]>([
  "商品1",
  "商品2",
  "商品3",
  "商品4",
  "商品5",
]);
async function onFetchSuggestions({ query }: { query: string }) {
  console.log("联想词:", query);

  try {
    // 调用后端接口
    const response = await fetch("/api/public/search/suggestions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keyword: query }),
    });

    // 获取流读取器和解码器
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("无法建立流式连接");
    }
    // 把content拼接成字符串
    let content = "";

    // 循环读取流数据
    while (true) {
      const { done, value } = await reader.read();

      if (done) break; // 流读取完成，退出循环

      // 解码二进制数据为字符串
      const rawChunk = decoder.decode(value);
      // 按SSE协议分割数据块
      const lines = rawChunk.split("\n\n").filter((line) => line.trim());
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6);

          // 收到结束信号
          if (dataStr === "[DONE]") continue;

          // 解析JSON数据
          const data = JSON.parse(dataStr);

          // 处理服务端返回的错误
          if (data.error) {
            throw new Error(data.error);
          }

          // 追加最终答案
          if (data.content) {
            content += data.content;
          }
          // 字符串分割为数组，根据\n
          const suggestions = content.split("\n").map((item) => item.trim());
          searchSuggestions.value = suggestions;
          // ✅ 关键：强制Vue立即更新DOM，实现逐字打字效果
          // 解决Vue异步批量更新导致内容一次性显示的问题
          await nextTick();
        }
      }
    }

    // 如果没有结果，使用查询词作为默认值
    if (searchSuggestions.value.length === 0) {
      searchSuggestions.value = [query];
    }
  } catch (error) {
    console.error("获取联想词失败:", error);
    searchSuggestions.value = [query];
  }
}
</script>
