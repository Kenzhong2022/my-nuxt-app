<template>
  <div class="pb-24">
    <!-- 标题 -->
    <div class="mb-4 md:mb-6">
      <h1 class="text-xl md:text-2xl font-bold">我的购物车</h1>
      <p v-if="!cart.isEmpty" class="text-sm text-gray-500 mt-1">
        共 {{ cart.totalCount }} 件商品
      </p>
    </div>

    <!-- 空购物车状态 -->
    <div
      v-if="cart.isEmpty"
      class="bg-white rounded-lg p-12 text-center"
    >
      <el-icon :size="64" class="text-gray-300 mb-4"><ShoppingCart /></el-icon>
      <p class="text-gray-500 mb-4">购物车空空如也</p>
      <el-button type="primary" @click="goShopping">去逛逛</el-button>
    </div>

    <!-- 购物车列表 -->
    <template v-else>
      <div class="space-y-3">
        <CartItemRow
          v-for="item in cart.items"
          :key="item.id"
          :item="item"
        />
      </div>

      <!-- 底部结算栏（吸底） -->
      <div
        class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-10"
      >
        <div
          class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3"
        >
          <!-- 全选 -->
          <el-checkbox
            :model-value="cart.isAllSelected"
            @change="cart.toggleSelectAll"
          >
            全选
          </el-checkbox>

          <!-- 已选信息 -->
          <div class="flex-1 text-sm text-gray-600">
            <span>已选 </span>
            <span class="text-primary font-semibold">{{ cart.selectedCount }}</span>
            <span> 件</span>
          </div>

          <!-- 合计 -->
          <div class="text-right">
            <div class="text-xs text-gray-500">合计</div>
            <div
              class="text-lg md:text-xl font-bold text-primary tabular-nums whitespace-nowrap min-w-[100px] inline-block"
            >
              ¥{{ cart.selectedPrice.toFixed(2) }}
            </div>
          </div>

          <!-- 结算按钮 -->
          <el-button
            type="primary"
            :disabled="cart.selectedCount === 0"
            @click="handleCheckout"
          >
            去结算({{ cart.selectedCount }})
          </el-button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ShoppingCart } from "@element-plus/icons-vue";
import CartItemRow from "~/components/CartItemRow.vue";

// 使用 store 布局
definePageMeta({
  layout: "store",
});

const cart = useCartStore();

// 初始化模拟数据（首次进入）
onMounted(() => {
  cart.initMockData();
});

function goShopping() {
  navigateTo("/");
}

function handleCheckout() {
  if (cart.selectedCount === 0) {
    ElMessage.warning("请先选择商品");
    return;
  }
  ElMessage.success(
    `已提交 ${cart.selectedCount} 件商品，合计 ¥${cart.selectedPrice.toFixed(2)}`,
  );
}
</script>
