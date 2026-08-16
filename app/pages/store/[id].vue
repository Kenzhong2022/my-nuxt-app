<!-- 商品详情页：调用 /api/public/products/:id，展示图集/规格/图文详情 -->
<template>
  <div class="product-detail">
    <!-- 加载中 -->
    <div v-if="loading" class="py-20 flex justify-center">
      <el-icon class="is-loading" :size="32"><Loading /></el-icon>
    </div>

    <!-- 加载失败 / 商品不存在 -->
    <el-result
      v-else-if="error || !product"
      icon="warning"
      title="无法加载商品"
      :sub-title="error || '商品不存在或已下架'"
    >
      <template #extra>
        <el-button type="primary" @click="navigateTo('/store')">
          返回商城
        </el-button>
      </template>
    </el-result>

    <template v-else>
      <!-- 面包屑 -->
      <el-breadcrumb separator="/" class="mb-4">
        <el-breadcrumb-item :to="{ path: '/store' }">商城</el-breadcrumb-item>
        <el-breadcrumb-item>{{ product.category }}</el-breadcrumb-item>
        <el-breadcrumb-item>{{ product.name }}</el-breadcrumb-item>
      </el-breadcrumb>

      <!-- 主信息区：图集 + 购买面板 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- 图集 -->
        <div class="gallery">
          <div class="gallery-main rounded-lg overflow-hidden">
            <el-image
              :src="
                cloudinaryUrl(product.image, 'w_800,h_800,c_fill,q_auto,f_webp')
              "
              :alt="product.name"
              fit="cover"
              :preview-src-list="galleryImages"
              :initial-index="currentImageIndex"
              preview-teleported
              class="w-full h-full"
            />
          </div>
          <div v-if="galleryImages.length > 1" class="gallery-thumbs">
            <div
              v-for="(img, i) in galleryImages"
              :key="i"
              class="gallery-thumb"
              :class="{ active: i === currentImageIndex }"
              @mouseenter="currentImageIndex = i"
              @click="currentImageIndex = i"
            >
              <img
                loading="lazy"
                :src="cloudinaryUrl(img, 'w_150,h_150,c_fill,q_auto,f_webp')"
                :alt="`${product.name} ${i + 1}`"
              />
            </div>
          </div>
        </div>

        <!-- 购买面板 -->
        <div class="purchase-panel">
          <h1 class="product-name">{{ product.name }}</h1>
          <p class="product-title">{{ product.title }}</p>

          <!-- 标签 -->
          <div v-if="product.tags?.length" class="tag-row">
            <el-tag
              v-for="tag in product.tags"
              :key="tag"
              size="small"
              effect="light"
            >
              {{ tag }}
            </el-tag>
          </div>

          <!-- 价格区 -->
          <div class="price-block">
            <span class="price">¥{{ product.price.toFixed(2) }}</span>
            <span v-if="product.originalPrice" class="original-price">
              ¥{{ product.originalPrice.toFixed(2) }}
            </span>
            <span v-if="discountPercent" class="discount">
              {{ discountPercent }}折
            </span>
          </div>

          <!-- 评分销量浏览 -->
          <div class="meta-row">
            <el-rate
              v-if="product.rating"
              :model-value="product.rating.rate"
              disabled
              size="small"
              :show-text="false"
            />
            <span v-if="product.rating" class="meta-item">
              {{ product.rating.rate }}（{{ product.rating.count }}人评价）
            </span>
            <span class="meta-item">已售 {{ product.sales }}</span>
            <span class="meta-item">{{ viewCountText }}</span>
          </div>

          <!-- 卖点 -->
          <ul v-if="product.highlights?.length" class="highlights">
            <li v-for="h in product.highlights" :key="h">{{ h }}</li>
          </ul>

          <!-- 服务承诺 -->
          <div v-if="product.services?.length" class="service-row">
            <span v-for="s in product.services" :key="s" class="service-item">
              <el-icon><CircleCheckFilled /></el-icon>{{ s }}
            </span>
          </div>

          <!-- 数量 + 加购 -->
          <div class="action-row">
            <el-input-number v-model="quantity" :min="1" :max="maxQuantity" />
            <el-button
              type="primary"
              size="large"
              :disabled="!product.stock"
              @click="handleAddToCart"
            >
              <div class="iconfont icon-cart1 mr-1"></div>
              {{ product.stock ? "加入购物车" : "已售罄" }}
            </el-button>
          </div>
          <p class="stock-tip">
            <template v-if="product.stock">
              库存 {{ product.stock }} 件
            </template>
            <template v-else>该商品暂时缺货，看看别的吧</template>
          </p>
        </div>
      </div>

      <!-- 规格参数 + 包装清单 -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <el-card v-if="specEntries.length" shadow="never">
          <template #header>
            <span class="section-title">规格参数</span>
          </template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item
              v-for="[key, value] in specEntries"
              :key="key"
              :label="key"
            >
              {{ value }}
            </el-descriptions-item>
          </el-descriptions>
        </el-card>

        <el-card v-if="product.packaging?.length" shadow="never">
          <template #header>
            <span class="section-title">包装清单</span>
          </template>
          <ul class="packaging-list">
            <li v-for="item in product.packaging" :key="item">{{ item }}</li>
          </ul>
        </el-card>
      </div>

      <!-- 图文详情（Markdown） -->
      <el-card v-if="product.detailContent" shadow="never">
        <template #header>
          <span class="section-title">商品详情</span>
        </template>
        <MarkdownView :content="product.detailContent" />
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { Loading, CircleCheckFilled } from "@element-plus/icons-vue";

definePageMeta({
  layout: "store",
});

const route = useRoute();
const cart = useCartStore();
const { product, loading, error, fetchById } = useProductDetail();

const quantity = ref(1);
const currentImageIndex = ref(0);

const id = Number(route.params.id);

const galleryImages = computed(() => {
  if (!product.value) return [];
  const gallery = product.value.gallery ?? [];
  const list = gallery.filter(Boolean);
  return list.length ? list : product.value.image ? [product.value.image] : [];
});

const currentImage = computed(
  () => galleryImages.value[currentImageIndex.value] ?? "",
);

const discountPercent = computed(() => {
  const current = product.value;
  if (!current?.originalPrice || current.originalPrice <= current.price) {
    return null;
  }
  return Math.round((current.price / current.originalPrice) * 100) / 10;
});

const maxQuantity = computed(() => product.value?.stock ?? 1);

const viewCountText = computed(() => {
  const count = product.value?.viewCount ?? 0;
  return count >= 10000
    ? `${(count / 10000).toFixed(1)}万浏览`
    : `${count}浏览`;
});

const specEntries = computed(() => Object.entries(product.value?.specs ?? {}));

watch(product, () => {
  currentImageIndex.value = 0;
  quantity.value = 1;
});

onMounted(() => {
  if (Number.isInteger(id) && id > 0) {
    fetchById(id);
  } else {
    error.value = "无效的商品ID";
  }
});

function handleAddToCart() {
  if (!product.value) {
    return;
  }
  cart.addToCart(product.value, quantity.value);
  ElMessage.success(`已加入购物车 ${quantity.value} 件`);
}
</script>

<style scoped lang="scss">
// ===================== 图集 =====================
.gallery-main {
  aspect-ratio: 1;
  background: var(--el-fill-color-light);
}

.gallery-thumbs {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  overflow-x: auto;
}

.gallery-thumb {
  flex-shrink: 0;
  width: 4.5rem;
  height: 4.5rem;
  border-radius: 0.375rem;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.2s;

  &.active {
    border-color: var(--el-color-primary);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

// ===================== 购买面板 =====================
.product-name {
  font-size: var(--kk-font-size-large);
  font-weight: 700;
  color: var(--el-text-color-primary);
  line-height: var(--kk-line-height-small);
}

.product-title {
  margin-top: 0.25rem;
  font-size: var(--kk-font-size-small);
  color: var(--el-text-color-secondary);
}

.tag-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.price-block {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: var(--el-color-danger-light-9);

  .price {
    font-size: var(--kk-font-size-extra-large);
    font-weight: 700;
    color: var(--el-color-danger);
  }

  .original-price {
    font-size: var(--kk-font-size-small);
    color: var(--el-text-color-placeholder);
    text-decoration: line-through;
  }

  .discount {
    font-size: var(--kk-font-size-extra-small);
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-8);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
  }
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-top: 0.75rem;
  font-size: var(--kk-font-size-small);
  color: var(--el-text-color-secondary);
}

.highlights {
  margin-top: 0.75rem;
  padding-left: 1.25rem;
  font-size: var(--kk-font-size-base);
  color: var(--el-text-color-regular);
  line-height: var(--kk-line-height-large);

  li + li {
    margin-top: 0.25rem;
  }
}

.service-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.75rem;

  .service-item {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: var(--kk-font-size-extra-small);
    color: var(--el-color-success);
  }
}

.action-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.stock-tip {
  margin-top: 0.5rem;
  font-size: var(--kk-font-size-extra-small);
  color: var(--el-text-color-placeholder);
}

// ===================== 参数/清单/详情卡片 =====================
.section-title {
  font-size: var(--kk-font-size-medium);
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.packaging-list {
  padding-left: 1.25rem;
  font-size: var(--kk-font-size-base);
  color: var(--el-text-color-regular);
  line-height: var(--kk-line-height-large);
}
</style>
