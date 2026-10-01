<template>
  <div
    class="cart-item-row rounded-lg p-3 md:p-4 flex gap-3 md:gap-4 items-center"
    :class="{ 'cart-item-row-shortage': isShortage }"
  >
    <!-- 勾选 -->
    <el-checkbox
      :model-value="isSelected"
      @change="cart.toggleSelect(item.id)"
    />

    <!-- 商品图片（点击进详情页） -->
    <div
      class="cart-image-wrapper relative w-20 h-20 md:w-24 md:h-24 rounded overflow-hidden flex-shrink-0 cursor-pointer"
      @click="goDetail"
    >
      <!-- w_150 与详情页缩略图同规格：命中浏览器/CDN 缓存，避免二次下载 -->
      <img
        loading="lazy"
        :src="cloudinaryUrl(item.image, 'w_150,h_150,c_fill,q_auto,f_webp')"
        :alt="item.name"
        class="w-full h-full object-cover"
        :class="{ 'image-dimmed': isShortage }"
      />
      <!-- 缺货遮罩：经典电商样式（半透明蒙层 + 居中角标） -->
      <div v-if="isShortage" class="shortage-overlay">
        <span class="shortage-badge">缺货</span>
      </div>
    </div>

    <!-- 商品信息 -->
    <div class="flex-1 min-w-0">
      <!-- 名称（点击进详情页） -->
      <h3
        class="text-sm md:text-base line-clamp-1 mb-1 cursor-pointer hover:text-[var(--el-color-primary)]"
        :title="item.name"
        @click="goDetail"
      >
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

        <!-- 数量调整：购物车不占用库存，max 即商品剩余库存 -->
        <el-input-number
          :model-value="item.qty"
          :min="1"
          :max="item.stock || 0"
          size="small"
          @change="handleQtyChange"
        />
      </div>

      <!-- 缺货提示条：浅红底柔和样式（数量 > 剩余库存） -->
      <div v-if="isShortage" class="shortage-tip">
        <el-icon class="shortage-tip-icon"><WarningFilled /></el-icon>
        <span>库存不足，仅剩 {{ item.stock }} 件，请调整数量</span>
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
import type { CartItem } from "~~/types/product";

const props = defineProps<{
  item: CartItem;
}>();

const cart = useCartStore();

const isSelected = computed(() => cart.selectedIds.includes(props.item.id));

// 缺货：购物车数量 > 商品剩余库存（结算校验/刷新后标红）
const isShortage = computed(() => props.item.qty > (props.item.stock ?? 0));

/** 跳转商品详情页 */
function goDetail() {
  navigateTo(`/myStore/${props.item.id}`);
}

/** 改数量：失败（库存不足等）提示并保持本地状态 */
async function handleQtyChange(value: number | undefined) {
  if (value === undefined) return;
  try {
    await cart.updateQty(props.item.id, value);
  } catch (err) {
    ElMessage.error((err as Error).message);
  }
}

function handleRemove() {
  ElMessageBox.confirm(`确认从购物车移除「${props.item.name}」？`, "提示", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await cart.removeFromCart(props.item.id);
        ElMessage.success("已移除");
      } catch (err) {
        ElMessage.error((err as Error).message);
      }
    })
    .catch(() => {});
}
</script>

<style scoped>
.cart-item-row {
  background: var(--el-bg-color);
}
/* 缺货整行灰底：置灰弱化（拉取购物车后发现缺货同样命中此样式） */
.cart-item-row-shortage {
  background: var(--el-fill-color-darker);
}
.cart-image-wrapper {
  background: var(--el-fill-color-light);
}
/* 缺货时商品图弱化（灰度 + 轻微降透明度） */
.image-dimmed {
  filter: grayscale(0.7);
  opacity: 0.75;
}
/* 缺货遮罩：铺满图片的半透明蒙层（el-mask-color 自动适配暗色主题） */
.shortage-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-mask-color);
}
/* 居中角标：灰底白字胶囊（置灰弱化，不用警示红） */
.shortage-badge {
  padding: 2px 10px;
  font-size: 12px;
  color: #fff;
  background: var(--el-color-info);
  border-radius: 999px;
}
/* 缺货提示条：白底圆角（与灰行底形成层次），灰色文案 + 图标 */
.shortage-tip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 3px 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  border-radius: 4px;
}
.shortage-tip-icon {
  font-size: 13px;
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
