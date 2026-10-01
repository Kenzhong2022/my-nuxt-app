<template>
  <div class="pb-8">
    <!-- 标题 -->
    <div class="mb-4 md:mb-6">
      <h1 class="text-xl md:text-2xl font-bold">我的订单</h1>
    </div>

    <!-- 状态筛选 -->
    <el-tabs v-model="statusFilter" class="mb-4" @tab-change="handleFilterChange">
      <el-tab-pane
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        :label="tab.label"
        :name="tab.value"
      />
    </el-tabs>

    <!-- 加载中 -->
    <div v-if="loading" class="order-loading rounded-lg p-12 text-center">
      <el-icon class="is-loading text-2xl"><Loading /></el-icon>
      <p class="order-loading-text mt-3">加载中...</p>
    </div>

    <!-- 空状态 -->
    <div v-else-if="!orders.length" class="order-empty rounded-lg p-12 text-center">
      <div class="order-empty-icon mb-4 text-6xl">📦</div>
      <p class="order-empty-text mb-4">暂无订单</p>
      <el-button type="primary" @click="goShopping">去逛逛</el-button>
    </div>

    <!-- 订单卡片列表 -->
    <template v-else>
      <div class="space-y-4">
        <div v-for="order in orders" :key="order.id" class="order-card rounded-lg p-4 md:p-5">
          <!-- 头部：订单号 + 时间 + 状态 -->
          <div class="order-card-header flex flex-wrap items-center gap-2 md:gap-4 pb-3 border-b">
            <span class="order-no text-sm tabular-nums">订单号：{{ order.orderNo }}</span>
            <span class="order-time text-sm">{{ formatTime(order.createdAt) }}</span>
            <el-tag class="ml-auto" :type="STATUS_META[order.status].type" size="small">
              {{ STATUS_META[order.status].label }}
            </el-tag>
          </div>

          <!-- 收货信息 -->
          <div class="order-address text-sm mt-3">
            <span class="order-address-label">收货人：</span>
            <span>{{ order.address.receiver }} {{ order.address.phone }}</span>
            <span class="order-address-region ml-2">
              {{ order.address.region }} {{ order.address.detail }}
            </span>
          </div>

          <!-- 商品明细 -->
          <div class="order-items mt-3 space-y-2">
            <div
              v-for="item in order.items"
              :key="item.productId"
              class="order-item-row flex items-center gap-3"
            >
              <div
                class="order-item-image w-14 h-14 md:w-16 md:h-16 rounded overflow-hidden flex-shrink-0 cursor-pointer"
                @click="goDetail(item.productId)"
              >
                <img
                  loading="lazy"
                  :src="cloudinaryUrl(item.productImage, 'w_150,h_150,c_fill,q_auto,f_webp')"
                  :alt="item.productName"
                  class="w-full h-full object-cover"
                />
              </div>
              <div class="flex-1 min-w-0">
                <h3
                  class="order-item-name text-sm md:text-base line-clamp-1 cursor-pointer"
                  :title="item.productName"
                  @click="goDetail(item.productId)"
                >
                  {{ item.productName }}
                </h3>
                <span class="order-item-unit-price text-xs tabular-nums">
                  ¥{{ item.unitPrice.toFixed(2) }} × {{ item.qty }}
                </span>
              </div>
            </div>
          </div>

          <!-- 备注 -->
          <div v-if="order.remark" class="order-remark text-sm mt-3">
            <span class="order-remark-label">备注：</span>{{ order.remark }}
          </div>

          <!-- 底部：合计 + 操作 -->
          <div class="order-card-footer flex flex-wrap items-center gap-3 mt-4 pt-3 border-t">
            <span v-if="order.status === 'pending'" class="order-expire-tip text-xs">
              请在 {{ formatTime(order.expiredAt || '') }} 前完成支付，超时自动取消
            </span>
            <div class="flex items-center gap-3 ml-auto">
              <span class="order-total text-sm">
                实付：
                <b class="order-total-price text-lg tabular-nums">
                  ¥{{ order.totalAmount.toFixed(2) }}
                </b>
              </span>
              <el-button
                v-if="order.status === 'pending'"
                size="small"
                type="primary"
                :loading="payingId === order.id"
                @click="handlePay(order)"
              >
                去支付
              </el-button>
              <el-button
                v-if="order.status === 'pending'"
                size="small"
                :loading="cancellingId === order.id"
                @click="handleCancel(order)"
              >
                取消订单
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="order-pagination flex justify-center mt-6">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          background
          hide-on-single-page
          @current-change="loadOrders"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ApiResponse } from "~~/types/common";
import type { OrderListResult, OrderStatus, StoreOrder } from "~~/types/order";

// 使用 store 布局；订单页不需要搜索栏
definePageMeta({
  layout: "store",
  showSearch: false,
});

/** 状态展示映射：中文文案 + el-tag 语义色 */
const STATUS_META: Record<
  OrderStatus,
  { label: string; type: "primary" | "success" | "warning" | "info" | "danger" }
> = {
  pending: { label: "待支付", type: "warning" },
  paid: { label: "已支付", type: "primary" },
  shipped: { label: "已发货", type: "primary" },
  completed: { label: "已完成", type: "success" },
  cancelled: { label: "已取消", type: "info" },
  expired: { label: "已过期", type: "info" },
};

/** 筛选 tab：'' = 全部 */
const STATUS_TABS: { label: string; value: string }[] = [
  { label: "全部", value: "" },
  { label: "待支付", value: "pending" },
  { label: "已支付", value: "paid" },
  { label: "已发货", value: "shipped" },
  { label: "已完成", value: "completed" },
  { label: "已取消", value: "cancelled" },
];

const orders = ref<StoreOrder[]>([]);
const loading = ref(false);
const statusFilter = ref("");
const page = ref(1);
const pageSize = 10;
const total = ref(0);
// 正在取消的订单 id（按钮 loading 防重复点击）
const cancellingId = ref<number | null>(null);
// 正在支付的订单 id
const payingId = ref<number | null>(null);

/** 去支付（模拟）：确认弹窗 → POST /api/orders/:id/pay → 刷新列表 */
function handlePay(order: StoreOrder) {
  ElMessageBox.confirm(
    `请完成订单 ${order.orderNo} 的支付`,
    "收银台（模拟）",
    { confirmButtonText: `支付 ¥${order.totalAmount.toFixed(2)}`, cancelButtonText: "取消", type: "info" },
  )
    .then(async () => {
      payingId.value = order.id;
      try {
        const res = await $fetch<ApiResponse<null>>(
          `/api/orders/${order.id}/pay`,
          { method: "POST" },
        );
        if (res.code === 200) {
          ElMessage.success("支付成功");
          await loadOrders();
        } else {
          ElMessage.error(res.message || "支付失败");
        }
      } finally {
        payingId.value = null;
      }
    })
    .catch(() => {});
}

/** 拉取订单列表（服务端每次拉取时惰性释放超时未付订单） */
async function loadOrders() {
  loading.value = true;
  try {
    const res = await $fetch<ApiResponse<OrderListResult | null>>("/api/orders", {
      query: {
        status: statusFilter.value || undefined,
        page: page.value,
        pageSize,
      },
    });
    if (res.code === 200 && res.data) {
      orders.value = res.data.items;
      total.value = res.data.total;
    } else {
      ElMessage.error(res.message || "获取订单失败");
    }
  } catch (err) {
    console.error("获取订单失败:", err);
    ElMessage.error("获取订单失败");
  } finally {
    loading.value = false;
  }
}

/** 切换筛选：回到第一页重新拉取 */
function handleFilterChange() {
  page.value = 1;
  loadOrders();
}

/** 取消订单：二次确认 → 调接口（归还库存）→ 刷新列表 */
function handleCancel(order: StoreOrder) {
  ElMessageBox.confirm(
    `确认取消订单 ${order.orderNo}？取消后商品库存将返还。`,
    "取消订单",
    { confirmButtonText: "确定取消", cancelButtonText: "再想想", type: "warning" },
  )
    .then(async () => {
      cancellingId.value = order.id;
      try {
        const res = await $fetch<ApiResponse<null>>(
          `/api/orders/${order.id}/cancel`,
          { method: "POST" },
        );
        if (res.code === 200) {
          ElMessage.success("订单已取消");
          await loadOrders();
        } else {
          ElMessage.error(res.message || "取消订单失败");
        }
      } finally {
        cancellingId.value = null;
      }
    })
    .catch(() => {});
}

function formatTime(iso: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function goDetail(productId: number) {
  navigateTo(`/myStore/${productId}`);
}

function goShopping() {
  navigateTo("/myStore");
}

onMounted(loadOrders);
</script>

<style scoped>
.order-card,
.order-empty,
.order-loading {
  background: var(--el-bg-color);
}
.order-card-header {
  border-color: var(--el-border-color-lighter);
  color: var(--el-text-color-secondary);
}
.order-no {
  color: var(--el-text-color-primary);
}
.order-address {
  color: var(--el-text-color-regular);
}
.order-address-label,
.order-address-region {
  color: var(--el-text-color-secondary);
}
.order-item-name {
  color: var(--el-text-color-primary);
}
.order-item-unit-price {
  color: var(--el-text-color-secondary);
}
.order-remark {
  color: var(--el-text-color-secondary);
}
.order-remark-label {
  color: var(--el-text-color-placeholder);
}
.order-card-footer {
  border-color: var(--el-border-color-lighter);
}
.order-expire-tip {
  color: var(--el-color-warning);
}
.order-total {
  color: var(--el-text-color-regular);
}
.order-total-price {
  color: var(--el-color-primary);
}
.order-empty-icon {
  color: var(--el-text-color-disabled);
}
.order-empty-text,
.order-loading-text {
  color: var(--el-text-color-secondary);
}
</style>
