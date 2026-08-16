<template>
  <div class="product-list">
    <h2 class="page-title">商品列表</h2>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchText"
        placeholder="搜索商品名称 / 标题"
        clearable
        style="width: 300px"
        @keyup.enter="handleSearch"
      />
      <el-button type="primary" @click="handleSearch">搜索</el-button>
      <el-button @click="handleReset">重置</el-button>
    </div>

    <!-- 商品表格 -->
    <div class="table-container">
      <el-table
        v-loading="loading"
        :data="products"
        fit
        empty-text="暂无商品数据"
      >
        <el-table-column
          prop="id"
          label="ID"
          min-width="70"
          :resizable="false"
          fixed="left"
        />
        <el-table-column label="商品图片" min-width="90" :resizable="false">
          <template #default="{ row }">
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
        </el-table-column>
        <el-table-column
          prop="name"
          label="商品名称"
          min-width="140"
          :resizable="false"
        />
        <el-table-column
          prop="title"
          label="标题"
          min-width="180"
          show-overflow-tooltip
          :resizable="false"
        />
        <el-table-column label="价格" min-width="120" :resizable="false">
          <template #default="{ row }">
            <span class="price">¥{{ row.price }}</span>
            <span v-if="row.originalPrice" class="original-price">
              ¥{{ row.originalPrice }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          prop="category"
          label="分类"
          min-width="100"
          :resizable="false"
        />
        <el-table-column
          prop="stock"
          label="库存"
          min-width="80"
          :resizable="false"
        />
        <el-table-column
          prop="sales"
          label="销量"
          min-width="80"
          :resizable="false"
        />
        <el-table-column label="评分" min-width="180" :resizable="false">
          <template #default="{ row }">
            <el-rate
              :model-value="row.rating?.rate ?? 0"
              disabled
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="160">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags || []"
              :key="tag"
              size="small"
              style="margin-right: 4px; margin-bottom: 2px"
            >
              {{ tag }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" min-width="170" :resizable="false">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="100"
          fixed="right"
          :resizable="false"
        >
          <template #default="{ row }">
            <el-button
              size="small"
              type="primary"
              @click="openEdit(row as Product)"
            >
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
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
    <EditDialog
      v-model:visible="editVisible"
      :product="editingProduct"
      @saved="fetchProducts"
    />
  </div>
</template>

<script setup lang="ts">
import type { Product } from "~~/types/product";
import { ElMessage } from "element-plus";
import dayjs from "dayjs";
import EditDialog from "./components/EditDialog.vue";

const products = ref<Product[]>([]);
const loading = ref(false);
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const searchText = ref("");

// 编辑弹窗状态
const editVisible = ref(false);
const editingProduct = ref<Product | null>(null);

async function fetchProducts() {
  loading.value = true;
  try {
    const res = await $fetch("/api/public/products/list", {
      params: {
        page: page.value,
        pageSize: pageSize.value,
        search: searchText.value,
      },
    });
    products.value = res.data || [];
    total.value = res.pagination?.total ?? 0;
  } catch (err) {
    console.error("获取商品列表失败:", err);
    ElMessage.error("获取商品列表失败");
    products.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  page.value = 1;
  fetchProducts();
}

function handleReset() {
  searchText.value = "";
  page.value = 1;
  fetchProducts();
}

function onPageSizeChange(val: number) {
  pageSize.value = val;
  page.value = 1;
  fetchProducts();
}

/**
 * 打开编辑弹窗，记录当前编辑的商品行
 * @param row - 当前行商品数据
 */
function openEdit(row: Product) {
  editingProduct.value = row;
  editVisible.value = true;
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  return dayjs(iso).format("YYYY-MM-DD HH:mm");
}

/**
 * 列表缩略图：100×100 裁剪 + 自动质量 + webp，大幅降低体积
 */
function thumbUrl(url: string) {
  return cloudinaryUrl(url, "w_100,h_100,c_fill,q_auto,f_webp");
}

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

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;
}

.table-container {
  overflow: hidden;
  background: var(--el-bg-color);
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

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
