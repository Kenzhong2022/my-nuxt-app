import { defineStore } from "pinia";
import type { ApiResponse } from "~~/types/common";
import type { CartItem, Product } from "~~/types/product";

// 后端加购/改数量的响应形状（data.qty = 该商品购物车总数量；购物车不占库存，无 stock 回传）
type CartMutationData = ApiResponse<{ qty: number } | null>;
// 后端删除的响应形状
type CartDeleteData = ApiResponse<{ qty: number } | null>;

export const useCartStore = defineStore("cart", () => {
  // ---------- state ----------
  const items = ref<CartItem[]>([]);
  const loading = ref(false);
  // 已勾选的商品 id 列表（用于结算）
  const selectedIds = ref<number[]>([]);

  // ---------- getters ----------
  // 总件数（用于顶部徽章 el-badge :value）
  const totalCount = computed(() =>
    items.value.reduce(
      /**总数，当前 */
      (sum, curItem) => {
        return sum + curItem.qty;
      },
      /**初始化 */
      0,
    ),
  );

  // 总价（全部商品）
  const totalPrice = computed(() =>
    items.value.reduce((sum, i) => sum + i.qty * i.price, 0),
  );

  // 是否为空
  const isEmpty = computed(() => items.value.length === 0);

  // 已勾选的商品列表
  const selectedItems = computed(() =>
    items.value.filter((i) => selectedIds.value.includes(i.id)),
  );

  // 已勾选的总件数
  const selectedCount = computed(() =>
    selectedItems.value.reduce((sum, i) => sum + i.qty, 0),
  );

  // 已勾选的总价（用于结算）
  const selectedPrice = computed(() =>
    selectedItems.value.reduce((sum, i) => sum + i.qty * i.price, 0),
  );

  // 是否全选
  const isAllSelected = computed(
    () =>
      items.value.length > 0 && selectedIds.value.length === items.value.length,
  );

  // ---------- actions ----------
  /**
   * 从后端拉取购物车
   * 适用场景：页面初始化、登录后、刷新
   */
  async function fetchCart() {
    loading.value = true;
    try {
      const res = await $fetch<ApiResponse<{ items: CartItem[] } | null>>(
        "/api/cart",
      );
      if (res.code === 200 && res.data) {
        items.value = res.data.items;
        // 剔除已不存在商品（下架/被删）的勾选残留
        const validIds = new Set(items.value.map((i) => i.id));
        selectedIds.value = selectedIds.value.filter((id) => validIds.has(id));
      }
    } catch (err) {
      console.error("获取购物车失败:", err);
    } finally {
      loading.value = false;
    }
  }

  /**
   * 添加商品到购物车（后端校验库存 + 落库，本地乐观镜像；库存留到结算环节扣）
   * 失败（库存不足 409 / 商品下架 404）抛 Error，由调用方提示
   */
  async function addToCart(product: Product, qty = 1) {
    const res = await $fetch<CartMutationData>("/api/cart", {
      method: "POST",
      body: { productId: product.id, qty },
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "加入购物车失败");
    }
    const exist = items.value.find((i) => i.id === product.id);
    if (exist) {
      exist.qty += qty;
    } else {
      items.value.push({
        ...product,
        qty,
        addedAt: new Date().toISOString(),
      });
    }
    // 新加入的商品默认勾选
    if (!selectedIds.value.includes(product.id)) {
      selectedIds.value.push(product.id);
    }
  }

  /**
   * 修改某商品数量（后端校验目标数量 <= 剩余库存，不调整库存）
   * qty <= 0 时走删除；库存不足（409）抛 Error 由调用方提示
   */
  async function updateQty(id: number, qty: number) {
    const item = items.value.find((i) => i.id === id);
    if (!item) return;
    if (qty <= 0) {
      await removeFromCart(id);
      return;
    }
    const res = await $fetch<CartMutationData>(`/api/cart/${id}`, {
      method: "PUT",
      body: { qty },
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.message || "修改数量失败");
    }
    item.qty = qty;
  }

  /**
   * 删除单个商品（仅移除购物车记录，库存未被占用无需归还；404 视为已删除）
   * 失败抛 Error 由调用方提示
   */
  async function removeFromCart(id: number) {
    const res = await $fetch<CartDeleteData>(`/api/cart/${id}`, {
      method: "DELETE",
    });
    if (res.code !== 200 && res.code !== 404) {
      throw new Error(res.message || "删除失败");
    }
    const idx = items.value.findIndex((i) => i.id === id);
    if (idx > -1) items.value.splice(idx, 1);
    // 同步移除勾选
    const sIdx = selectedIds.value.indexOf(id);
    if (sIdx > -1) selectedIds.value.splice(sIdx, 1);
  }

  /**
   * 清空购物车
   */
  function clearCart() {
    items.value = [];
    selectedIds.value = [];
  }

  /**
   * 切换单个商品的勾选状态
   */
  function toggleSelect(id: number) {
    const idx = selectedIds.value.indexOf(id);
    if (idx > -1) {
      selectedIds.value.splice(idx, 1);
    } else {
      selectedIds.value.push(id);
    }
  }

  /**
   * 切换全选/全不选
   */
  function toggleSelectAll() {
    if (isAllSelected.value) {
      selectedIds.value = [];
    } else {
      selectedIds.value = items.value.map((i) => i.id);
    }
  }

  return {
    // state
    items,
    loading,
    selectedIds,
    // getters
    totalCount,
    totalPrice,
    isEmpty,
    selectedItems,
    selectedCount,
    selectedPrice,
    isAllSelected,
    // actions
    fetchCart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    toggleSelect,
    toggleSelectAll,
  };
});
