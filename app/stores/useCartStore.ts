import { defineStore } from "pinia";
import type { Product } from "~~/types/product";

// 购物车里的单项：商品 + 数量 + 加购时间
export interface CartItem extends Product {
  qty: number;
  addedAt: string;
}

// 后端返回的购物车数据形状
interface CartResponse {
  code: number;
  data: {
    items: CartItem[];
    totalCount: number;
    totalPrice: number;
  };
}

// 模拟数据：从产品库中取前 3 个商品作为初始购物车内容
// 实际项目里这段代码会从 /api/cart 拉取
const MOCK_CART_ITEMS: CartItem[] = [
  {
    id: 1,
    name: "无线蓝牙耳机",
    price: 199,
    originalPrice: 299,
    image: "https://picsum.photos/400/400?random=1",
    rating: 4.5,
    sales: 2580,
    tags: ["热销"],
    category: "数码",
    stock: 100,
    qty: 1,
    addedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 分钟前
  },
  {
    id: 2,
    name: "智能手表 Pro",
    price: 1299,
    originalPrice: 1599,
    image: "https://picsum.photos/400/400?random=2",
    rating: 4.8,
    sales: 1560,
    tags: ["新品"],
    category: "数码",
    stock: 50,
    qty: 1,
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 小时前
  },
  {
    id: 9,
    name: "运动水杯 800ml",
    price: 59,
    originalPrice: 89,
    image: "https://picsum.photos/400/400?random=9",
    rating: 4.1,
    sales: 4500,
    category: "运动",
    stock: 500,
    qty: 2,
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 天前
  },
];

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
   * 初始化模拟数据
   * 适用场景：首次进入购物车、无后端接口时使用
   */
  function initMockData() {
    if (items.value.length > 0) return; // 已有数据则不重复初始化
    items.value = JSON.parse(JSON.stringify(MOCK_CART_ITEMS));
    // 默认全部勾选
    selectedIds.value = items.value.map((i) => i.id);
  }

  /**
   * 从后端拉取购物车
   * 适用场景：页面初始化、登录后、刷新
   */
  async function fetchCart() {
    loading.value = true;
    try {
      const res = await $fetch<CartResponse>("/api/cart");
      items.value = res.data.items;
    } catch (err) {
      console.error("获取购物车失败:", err);
      // 接口失败时使用 mock 数据兜底
      initMockData();
    } finally {
      loading.value = false;
    }
  }

  /**
   * 添加商品到购物车
   * 已存在则 +qty，否则新增
   */
  function addToCart(product: Product, qty = 1) {
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
   * 修改某商品数量
   * qty <= 0 时自动删除
   */
  function updateQty(id: number, qty: number) {
    const item = items.value.find((i) => i.id === id);
    if (!item) return;
    if (qty <= 0) {
      removeFromCart(id);
    } else {
      item.qty = qty;
    }
  }

  /**
   * 删除单个商品
   */
  function removeFromCart(id: number) {
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
    initMockData,
    fetchCart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    toggleSelect,
    toggleSelectAll,
  };
});
