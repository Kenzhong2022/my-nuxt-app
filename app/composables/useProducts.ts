import type {
  Product,
  ProductListApiRequest,
  ProductListApiResponse,
  ProductDetail,
} from "~~/types/product";
import type { ApiResponse, Pagination } from "~~/types/common";

interface UseProductsReturn {
  products: Ref<Product[]>;
  loading: Ref<boolean>;
  hasMore: Ref<boolean>;
  pagination: Ref<Pagination>;
  loadMore: () => Promise<void>;
}

export function useProducts(
  query: ProductListApiRequest = {},
): UseProductsReturn {
  const loading = ref(false);
  const hasMore = ref(true);
  const page = ref(query.page ? query.page : 1);
  const pageSize = ref(query.pageSize || 5);
  const search = ref(query.search || "");
  const category = ref(query.category || "");

  const pagination = computed(() => ({
    current: page.value,
    pageSize: pageSize.value,
    total: 0,
  }));

  const { data: products } = useAsyncData<Product[]>(
    `products-list-${search.value}-${category.value}`,
    async () => {
      if (!query.pageSize) return [];
      const response = await $fetch<ProductListApiResponse>(
        "/api/public/products/list",
        {
          method: "GET",
          query: {
            page: 1,
            pageSize: pageSize.value,
            search: search.value,
            category: category.value,
          },
        },
      );
      const total = response.pagination?.total || 0;
      hasMore.value = (response.data?.length || 0) < total;
      return response.data;
    },
    {
      default: () => [],
      immediate: !!query.pageSize,
    },
  );

  /**
   * 加载更多商品
   */
  async function loadMore() {
    if (loading.value || !hasMore.value) {
      return;
    }
    loading.value = true;
    try {
      page.value++;
      const response = await $fetch<ApiResponse<Product[]>>(
        "/api/public/products/list",
        {
          query: {
            page: page.value,
            pageSize: pageSize.value,
            search: search.value,
            category: category.value,
          },
          method: "GET",
        },
      );

      if (response.data.length === 0) {
        hasMore.value = false;
        return;
      }
      products.value.push(...response.data);
    } catch (error) {
      console.error("获取商品列表失败:", error);
    } finally {
      loading.value = false;
    }
  }

  return {
    products,
    loading,
    hasMore,
    pagination,
    loadMore,
  };
}

export function useProductDetail() {
  const product = ref<ProductDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchById(id: number) {
    loading.value = true;
    error.value = null;

    try {
      const response = await $fetch<ApiResponse<ProductDetail | null>>(
        `/api/public/products/${id}`,
      );

      if (response.code === 200) {
        product.value = response.data;
      } else {
        error.value = response.message || "获取商品详情失败";
      }
    } catch (err) {
      error.value = "网络错误";
      console.error("获取商品详情失败:", err);
    } finally {
      loading.value = false;
    }
  }

  return {
    product,
    loading,
    error,
    fetchById,
  };
}
