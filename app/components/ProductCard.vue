<template>
  <!-- 商品卡片组件 -->
  <div
    class="product-card rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden cursor-pointer"
  >
    <!-- 商品图片区域 -->
    <div class="product-image-wrapper relative aspect-square">
      <img
        :src="product.image"
        :alt="product.name"
        class="w-full h-full object-cover"
      />
      <!-- 商品标签 -->
      <div
        v-if="product.tags && product.tags.length"
        class="absolute top-2 left-2 flex gap-1"
      >
        <span
          v-for="tag in product.tags"
          :key="tag"
          class="product-tag px-2 py-1 text-white text-xs rounded"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- 商品信息区域 -->
    <div class="p-4">
      <!-- 商品名称 - 单行省略 -->
      <h3 class="text-base font-medium line-clamp-1 mb-2">
        {{ product.name }}
      </h3>

      <!-- 评分和销量 -->
      <div
        v-if="product.rating || product.sales"
        class="product-meta flex items-center gap-3 mb-2 text-xs"
      >
        <el-rate
          v-if="product.rating"
          :model-value="product.rating.rate"
          :show-text="false"
          :disabled="true"
          size="small"
        />
        <span v-else>无评分</span>
        <span v-if="product.sales">已售 {{ product.sales }}</span>
      </div>

      <!-- 价格区域 -->
      <div class="flex items-end gap-2">
        <span class="product-price text-xl font-bold"
          >¥{{ product.price.toFixed(2) }}</span
        >
        <span
          v-if="product.originalPrice"
          class="product-original-price text-sm line-through"
        >
          ¥{{ product.originalPrice.toFixed(2) }}
        </span>
      </div>

      <!-- 加入购物车按钮 -->
      <div class="mt-4">
        <el-button
          type="primary"
          size="small"
          class="w-full"
          @click.stop="handleAdd"
        >
          <div class="iconfont icon-cart1 mr-2"></div>
          加入购物车
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~~/types/product";

// 接收商品数据
const props = defineProps<{
  product: Product;
}>();

const cart = useCartStore();

function handleAdd() {
  cart.addToCart(props.product, 1);
  ElMessage.success("已加入购物车");
}
</script>

<style scoped>
.product-card {
  background: var(--el-bg-color);
}
.product-image-wrapper {
  background: var(--el-fill-color-light);
}
.product-tag {
  background: var(--el-color-danger);
}
.product-meta {
  color: var(--el-text-color-secondary);
}
.product-price {
  color: var(--el-color-primary);
}
.product-original-price {
  color: var(--el-text-color-placeholder);
}
</style>
