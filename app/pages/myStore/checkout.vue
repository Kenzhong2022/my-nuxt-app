<template>
  <div class="pb-24">
    <!-- 标题 -->
    <div class="mb-4 md:mb-6">
      <h1 class="text-xl md:text-2xl font-bold">确认订单</h1>
    </div>

    <div v-loading="loading">
      <!-- 收货地址 -->
      <section class="checkout-section rounded-lg p-4 md:p-5 mb-3">
        <div class="flex items-center justify-between mb-2">
          <h2 class="checkout-section-title text-sm md:text-base font-semibold">
            收货地址
          </h2>
          <el-button link type="primary" @click="pickerVisible = true">
            {{ address ? "更换地址" : "选择地址" }}
          </el-button>
        </div>
        <div v-if="address" class="address-summary">
          <div class="address-line1">
            <span class="address-receiver">{{ address.receiver }}</span>
            <span class="address-phone">{{ address.phone }}</span>
            <el-tag
              v-if="address.isDefault"
              type="danger"
              size="small"
              effect="light"
            >
              默认
            </el-tag>
          </div>
          <div class="address-detail">
            {{ address.region }} {{ address.detail }}
          </div>
        </div>
        <p v-else class="address-empty">
          暂无收货地址，点击「选择地址」新增
        </p>
      </section>

      <!-- 商品清单 -->
      <section class="checkout-section rounded-lg p-4 md:p-5 mb-3">
        <h2 class="checkout-section-title text-sm md:text-base font-semibold mb-3">
          商品清单
        </h2>
        <div
          v-for="item in preview?.items ?? []"
          :key="item.id"
          class="checkout-item"
          :class="{ shortage: isShortage(item.id) }"
        >
          <img
            loading="lazy"
            :src="cloudinaryUrl(item.image, 'w_150,h_150,c_fill,q_auto,f_webp')"
            :alt="item.name"
            class="checkout-item-image w-16 h-16 md:w-20 md:h-20 rounded overflow-hidden flex-shrink-0"
          />
          <div class="flex-1 min-w-0">
            <h3 class="text-sm line-clamp-1" :title="item.name">
              {{ item.name }}
            </h3>
            <div class="checkout-item-meta text-xs mt-1">
              ¥{{ item.price.toFixed(2) }} × {{ item.qty }}
            </div>
            <!-- 缺货提示：加购后库存被他人消费，需回购物车调整 -->
            <div v-if="isShortage(item.id)" class="checkout-item-shortage text-xs mt-1">
              库存不足（剩余 {{ shortageStock(item.id) }} 件），请调整数量
            </div>
          </div>
          <span
            class="checkout-item-subtotal text-sm font-semibold tabular-nums whitespace-nowrap"
          >
            ¥{{ (item.qty * item.price).toFixed(2) }}
          </span>
        </div>
        <el-empty
          v-if="!loading && !preview?.items.length"
          description="没有可结算的商品"
          :image-size="80"
        />
      </section>

      <!-- 金额明细 -->
      <section class="checkout-section rounded-lg p-4 md:p-5 mb-3">
        <h2 class="checkout-section-title text-sm md:text-base font-semibold mb-3">
          金额明细
        </h2>
        <div class="amount-row">
          <span>商品金额</span>
          <span class="tabular-nums">¥{{ (preview?.totalAmount ?? 0).toFixed(2) }}</span>
        </div>
        <div class="amount-row">
          <span>运费</span>
          <span class="tabular-nums">¥0.00</span>
        </div>
        <div class="amount-row amount-row-total">
          <span>合计</span>
          <span class="amount-total-value tabular-nums">¥{{ (preview?.totalAmount ?? 0).toFixed(2) }}</span>
        </div>
      </section>

      <!-- 订单备注 -->
      <section class="checkout-section rounded-lg p-4 md:p-5">
        <h2 class="checkout-section-title text-sm md:text-base font-semibold mb-2">
          订单备注
        </h2>
        <el-input
          v-model="remark"
          type="textarea"
          :rows="2"
          maxlength="200"
          show-word-limit
          placeholder="选填，如配送时间要求等"
        />
      </section>
    </div>

    <!-- 底部提交栏（吸底） -->
    <div class="checkout-footer fixed bottom-0 left-0 right-0 border-t shadow-lg z-10">
      <div class="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
        <div class="flex-1 text-sm checkout-footer-tip">
          <span v-if="!address">请先选择收货地址</span>
          <span v-else-if="hasShortage">存在库存不足商品，请调整后再结算</span>
          <span v-else>共 {{ preview?.items.length ?? 0 }} 种商品</span>
        </div>
        <div class="text-right">
          <div class="checkout-footer-label text-xs">合计</div>
          <div class="checkout-footer-amount text-lg md:text-xl font-bold tabular-nums whitespace-nowrap">
            ¥{{ (preview?.totalAmount ?? 0).toFixed(2) }}
          </div>
        </div>
        <el-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
          提交订单
        </el-button>
      </div>
    </div>

    <!-- 地址选择弹窗 -->
    <AddressPicker
      v-model:visible="pickerVisible"
      :selected="address?.id ?? null"
      @select="address = $event"
    />
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse } from "~~/types/common";
import type { CheckoutPreview } from "~~/types/product";
import type { StoreAddress } from "~~/types/address";
import type { OrderCreateResult } from "~~/types/order";

// 使用 store 布局（与购物车一致，不需要搜索栏）
definePageMeta({
  layout: "store",
  showSearch: false,
});

const route = useRoute();

const loading = ref(false);
const submitting = ref(false);
const preview = ref<CheckoutPreview | null>(null);
const address = ref<StoreAddress | null>(null);
const pickerVisible = ref(false);
const remark = ref("");

const cart = useCartStore();

// 结算的商品 id 列表（由购物车页 query 携带：/myStore/checkout?ids=1,2,3）
const productIds = computed(() =>
  String(route.query.ids ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0),
);

/** 该商品是否在缺货清单中 */
function isShortage(id: number) {
  return (preview.value?.insufficient ?? []).some((i) => i.productId === id);
}

/** 缺货商品的剩余库存（展示用） */
function shortageStock(id: number) {
  return (
    (preview.value?.insufficient ?? []).find((i) => i.productId === id)?.stock ??
    0
  );
}

const hasShortage = computed(() => (preview.value?.insufficient.length ?? 0) > 0);

const canSubmit = computed(
  () =>
    !!preview.value &&
    preview.value.items.length > 0 &&
    !!address.value &&
    !hasShortage.value,
);

/** 拉取结算预览；预览数据是唯一金额事实源（服务端重算） */
async function loadCheckout() {
  if (!productIds.value.length) {
    ElMessage.warning("请先在购物车勾选商品");
    return navigateTo("/myStore/cart");
  }
  loading.value = true;
  try {
    const res = await $fetch<ApiResponse<CheckoutPreview | null>>("/api/checkout", {
      query: { productIds: productIds.value.join(",") },
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "获取结算信息失败");
    }
    preview.value = res.data;
    // 默认选中默认地址（列表已默认置顶），没有则选第一条
    const list = res.data.addresses;
    address.value = list.find((a) => a.isDefault) ?? list[0] ?? null;
  } catch (e) {
    ElMessage.error((e as Error).message);
  } finally {
    loading.value = false;
  }
}

onMounted(loadCheckout);

/** 模拟支付：确认弹窗 → POST /api/orders/:id/pay（默认成功，扭转 pending → paid） */
async function mockPay(order: OrderCreateResult) {
  const confirmed = await ElMessageBox.confirm(
    `订单已创建，请完成支付 ¥${order.totalAmount.toFixed(2)}`,
    "收银台（模拟）",
    { confirmButtonText: "立即支付", cancelButtonText: "稍后支付", type: "info" },
  )
    .then(() => true)
    .catch(() => false);
  if (!confirmed) {
    ElMessage.info("订单待支付，30 分钟内未支付将自动取消");
    return;
  }
  try {
    const res = await $fetch<ApiResponse<null>>(`/api/orders/${order.orderId}/pay`, {
      method: "POST",
    });
    if (res.code === 200) {
      ElMessage.success("支付成功");
    } else {
      ElMessage.error(res.message || "支付失败");
    }
  } catch {
    ElMessage.error("支付失败");
  }
}

/** 提交订单：POST /api/orders 事务扣库存下单 → 模拟支付收银台 */
async function handleSubmit() {
  if (!canSubmit.value || !address.value || !preview.value) return;
  submitting.value = true;
  try {
    const res = await $fetch<ApiResponse<OrderCreateResult | null>>("/api/orders", {
      method: "POST",
      body: {
        addressId: address.value.id,
        productIds: productIds.value,
        remark: remark.value || undefined,
      },
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "提交订单失败");
    }
    // 已购商品从购物车移除，刷新本地购物车
    await cart.fetchCart();
    // 模拟支付流程（真实支付接入后替换）
    await mockPay(res.data);
    navigateTo("/myStore/orders");
  } catch (e) {
    ElMessage.error((e as Error).message);
    // 库存不足等失败可能源于预览过期，重新拉取最新预览
    await loadCheckout();
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.checkout-section {
  background: var(--el-bg-color);
}
.checkout-section-title {
  color: var(--el-text-color-primary);
}
.address-line1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.address-receiver {
  font-weight: 600;
}
.address-phone {
  color: var(--el-text-color-secondary);
}
.address-detail {
  font-size: 13px;
  color: var(--el-text-color-regular);
  word-break: break-all;
}
.address-empty {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}
.checkout-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.checkout-item:last-child {
  border-bottom: none;
}
.checkout-item-image {
  background: var(--el-fill-color-light);
}
.checkout-item-meta {
  color: var(--el-text-color-secondary);
}
.checkout-item-shortage {
  color: var(--el-color-danger);
}
.checkout-item-subtotal {
  color: var(--el-color-primary);
}
.amount-row {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--el-text-color-regular);
  padding: 4px 0;
}
.amount-row-total {
  border-top: 1px solid var(--el-border-color-lighter);
  margin-top: 4px;
  padding-top: 10px;
}
.amount-total-value {
  color: var(--el-color-primary);
  font-weight: 700;
  font-size: 16px;
}
.checkout-footer {
  background: var(--el-bg-color);
  border-color: var(--el-border-color-light);
}
.checkout-footer-tip {
  color: var(--el-text-color-secondary);
}
.checkout-footer-label {
  color: var(--el-text-color-secondary);
}
.checkout-footer-amount {
  color: var(--el-color-primary);
}
</style>
