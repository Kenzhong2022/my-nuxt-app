<template>
  <div
    class="cart-item-row rounded-lg p-3 md:p-4 flex gap-3 md:gap-4 items-center"
  >
    <!-- 勾选 -->
    <el-checkbox
      :model-value="isSelected"
      @change="cart.toggleSelect(item.id)"
    />

    <!-- 商品图片 -->
    <div
      class="cart-image-wrapper w-20 h-20 md:w-24 md:h-24 rounded overflow-hidden flex-shrink-0"
    >
      <img
        :src="item.image"
        :alt="item.name"
        class="w-full h-full object-cover"
      />
    </div>

    <!-- 商品信息 -->
    <div class="flex-1 min-w-0">
      <!-- 名称 -->
      <h3 class="text-sm md:text-base line-clamp-1 mb-1" :title="item.name">
        {{ item.name }}
      </h3>

      <!-- 标签 -->
      <div v-if="item.tags && item.tags.length" class="flex gap-1 mb-2">
        <span
          v-for="tag in item.tags"
          :key="tag"
          class="cart-tag px-1.5 py-0.5 text-xs rounded"
        >
          {{ tag }}
        </span>
      </div>

      <!-- 价格 + 数量 + 小计（移动端竖排，桌面端横排） -->
      <div class="flex items-end justify-between gap-2 flex-wrap">
        <div class="flex items-baseline gap-2 flex-shrink-0">
          <span
            class="cart-price text-base md:text-lg font-bold tabular-nums whitespace-nowrap min-w-[72px] text-right inline-block"
          >
            ¥{{ item.price.toFixed(2) }}
          </span>
          <span
            v-if="item.originalPrice"
            class="cart-original-price text-xs line-through tabular-nums whitespace-nowrap"
          >
            ¥{{ item.originalPrice.toFixed(2) }}
          </span>
        </div>

        <!-- 数量调整 -->
        <el-input-number
          :model-value="item.qty"
          :min="1"
          :max="item.stock || 99"
          size="small"
          @change="(v) => cart.updateQty(item.id, v as number)"
        />
      </div>
    </div>

    <!-- 操作区：删除按钮（移动端放下面，桌面端放右侧） -->
    <div class="flex flex-col items-end gap-2 w-24 flex-shrink-0">
      <span
        class="cart-subtotal text-sm md:text-base font-semibold tabular-nums whitespace-nowrap w-full text-right"
      >
        ¥{{ (item.qty * item.price).toFixed(2) }}
      </span>
      <el-button type="danger" link size="small" @click="handleRemove">
        删除
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CartItem } from "~/stores/useCartStore";

const props = defineProps<{
  item: CartItem;
}>();

const cart = useCartStore();

const isSelected = computed(() => cart.selectedIds.includes(props.item.id));

function handleRemove() {
  ElMessageBox.confirm(`确认从购物车移除「${props.item.name}」？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(() => {
      cart.removeFromCart(props.item.id);
      ElMessage.success("已移除");
    })
    .catch(() => {});
}
</script>

<style scoped>
.cart-item-row {
  background: var(--el-bg-color);
}
.cart-image-wrapper {
  background: var(--el-fill-color-light);
}
.cart-tag {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}
.cart-price {
  color: var(--el-color-primary);
}
.cart-original-price {
  color: var(--el-text-color-placeholder);
}
.cart-subtotal {
  color: var(--el-color-primary);
}
</style>
