<template>
  <div class="product-list">
    <h2 class="page-title">商品列表</h2>

    <!-- 使用 BaseTable 替代原有 el-table -->
    <BaseTable
      ref="baseTableRef"
      :columns="columns"
      :data="sortedProducts"
      :loading="loading"
      fit
      border
      empty-text="暂无商品数据"
      @search="handleSearch"
      @reset="handleReset"
    >
      <!-- 自定义搜索栏（完全保留原样式和逻辑） -->
      <template #search-bar>
        <el-input
          v-model="searchText"
          placeholder="搜索商品名称 / 标题"
          clearable
          style="width: 300px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </template>

      <!-- 自定义列：商品图片 -->
      <template #imageSlot="{ row }">
        <el-image
          :alt="row.image"
          :src="thumbUrl(row.image)"
          style="width: 50px; height: 50px"
          fit="cover"
          :preview-src-list="[row.image]"
          preview-teleported
        >
          <template #error>
            <div class="image-placeholder">无图</div>
          </template>
        </el-image>
      </template>

      <!-- 自定义价格表头 -->
      <template #priceHeader="{ column, $index }">
        <div class="custom-header" @click="toggleSort">
          <span>价格</span>
          <span class="sort-indicator">
            <span v-if="sortField === 'price'">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
            <span v-else>↕</span>
          </span>
        </div>
      </template>
      <!-- 自定义列：价格 -->
      <template #priceSlot="{ row }">
        <span class="price">¥{{ row.price }}</span>
        <span v-if="row.originalPrice" class="original-price"> ¥{{ row.originalPrice }} </span>
      </template>

      <!-- 自定义列：评分 -->
      <template #ratingSlot="{ row }">
        <el-rate :model-value="row.rating?.rate ?? 0" disabled score-template="{value}" />
      </template>

      <!-- 自定义列：标签 -->
      <template #tagsSlot="{ row }">
        <el-tag v-for="tag in row.tags || []" :key="tag" size="small" style="margin-right: 4px; margin-bottom: 2px">
          {{ tag }}
        </el-tag>
      </template>

      <!-- 自定义列：创建时间 -->
      <template #createdAtSlot="{ row }">
        {{ formatTime(row.createdAt) }}
      </template>

      <!-- 自定义列：操作 -->
      <template #actionsSlot="{ row }">
        <el-button size="small" type="primary" @click="openEdit(row as Product)"> 编辑 </el-button>
        <el-button size="small" @click="openDetail(row as Product)"> 详情 </el-button>
      </template>
    </BaseTable>

    <!-- 分页（放在 BaseTable 外部，保持灵活性） -->
    <div class="pagination-wrapper">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 30, 50]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="fetchProducts"
        @size-change="onPageSizeChange"
      />
    </div>

    <!-- 编辑商品弹窗 -->
    <EditDialog v-model:visible="editVisible" :product="editingProduct" @saved="fetchProducts" />

    <!-- 编辑商品详情抽屉 -->
    <DetailDrawer v-model:visible="detailVisible" :product="detailProduct" />
  </div>
</template>

<script setup lang="ts">
import type { Product } from '~~/types/product';
import { ElMessage } from 'element-plus';
import dayjs from 'dayjs';
import EditDialog from './components/EditDialog.vue';
import DetailDrawer from './components/DetailDrawer.vue';

// ========== 表格列配置 ==========
const columns = [
  { prop: 'id', label: 'ID', minWidth: 70, resizable: false, fixed: 'left' },
  { label: '商品图片', slotName: 'imageSlot', minWidth: 90, resizable: false },
  { prop: 'name', label: '商品名称', minWidth: 140, resizable: false },
  { prop: 'title', label: '标题', minWidth: 180, showOverflowTooltip: true, resizable: false },
  {
    label: '价格',
    slotName: 'priceSlot',
    headerSlotName: 'priceHeader', // 新增：表头自定义
    prop: 'price', // 用于排序时的字段名
    minWidth: 120,
    resizable: false,
  },
  { prop: 'category', label: '分类', minWidth: 100, resizable: false },
  { prop: 'stock', label: '库存', minWidth: 80, resizable: false },
  { prop: 'sales', label: '销量', minWidth: 80, resizable: false },
  { label: '评分', slotName: 'ratingSlot', minWidth: 180, resizable: false },
  { label: '标签', slotName: 'tagsSlot', minWidth: 160 },
  { label: '创建时间', slotName: 'createdAtSlot', minWidth: 170, resizable: false },
  { label: '操作', slotName: 'actionsSlot', width: 150, fixed: 'right', resizable: false },
];

// ========== 状态 ==========
const products = ref<Product[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchText = ref('');
const sortField = ref<'price' | null>(null);
const sortOrder = ref<'asc' | 'desc'>('asc');

// 编辑弹窗状态
const editVisible = ref(false);
const editingProduct = ref<Product | null>(null);

// 详情抽屉状态
const detailVisible = ref(false);
const detailProduct = ref<Product | null>(null);

// 本地排序后的商品列表（不影响原始 products）
const sortedProducts = computed(() => {
  if (!sortField.value) return products.value;
  const list = [...products.value]; // 浅拷贝，避免修改原数组
  return list.sort((a, b) => {
    const aVal = a[sortField.value as keyof Product];
    const bVal = b[sortField.value as keyof Product];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortOrder.value === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });
});

// ========== 数据请求 ==========
async function fetchProducts() {
  loading.value = true;
  try {
    const res = await $fetch('/api/public/products/list', {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        search: searchText.value,
      },
    });
    products.value = res.data || [];
    total.value = res.pagination?.total ?? 0;
  } catch (err) {
    console.error('获取商品列表失败:', err);
    ElMessage.error('获取商品列表失败');
    products.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function toggleSort() {
  if (sortField.value !== 'price') {
    sortField.value = 'price';
    sortOrder.value = 'asc';
  } else {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  }
  // 无需重新请求数据，计算属性会自动更新
}

// ========== 搜索与重置 ==========
function handleSearch() {
  page.value = 1;
  fetchProducts();
}

function handleReset() {
  searchText.value = '';
  page.value = 1;
  fetchProducts();
}

// ========== 分页 ==========
function onPageSizeChange(val: number) {
  pageSize.value = val;
  page.value = 1;
  fetchProducts();
}

// ========== 操作 ==========
function openEdit(row: Product) {
  editingProduct.value = row;
  editVisible.value = true;
}

function openDetail(row: Product) {
  detailProduct.value = row;
  detailVisible.value = true;
}

// ========== 工具 ==========
function formatTime(iso?: string) {
  if (!iso) return '—';
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
}

/**
 * 列表缩略图：100×100 裁剪 + 自动质量 + webp
 * 若未配置 cloudinary，可直接返回原图 url 或使用其他裁剪服务
 */
function thumbUrl(url: string) {
  // 如果你使用了 Cloudinary，可替换为真实函数
  // return cloudinaryUrl(url, 'w_100,h_100,c_fill,q_auto,f_webp')
  return url; // 临时返回原图
}

// ========== 生命周期 ==========
onMounted(fetchProducts);
</script>

<style scoped>
.product-list {
  padding: 24px;
  min-width: 900px;
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 20px;
  color: var(--el-text-color-primary);
}

/* BaseTable 内部已包含搜索栏样式，但为了保持原样式，我们在 search-bar 插槽中自定义了布局 */
/* 因此无需额外覆盖 .search-bar，因为插槽内容已完全控制 */

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.price {
  color: var(--el-color-danger);
  font-weight: 600;
}

.original-price {
  margin-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-decoration: line-through;
}

.image-placeholder {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
