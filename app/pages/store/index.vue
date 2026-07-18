<template>
  <div class="product-card">
    <div class="mb-6 md:mb-8">
      <h1 class="text-xl md:text-2xl font-bold">热门商品</h1>
    </div>

    <div class="grid grid-cols-2 gap-4 md:grid-cols-5 md:gap-6">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
      />
    </div>
    <LoadMore :loading="loading" :has-more="hasMore" @load-more="loadMore" />
    <el-backtop :right="100" :bottom="100" />
  </div>
</template>

<script setup lang="ts">
// 定义页面使用 store 布局
definePageMeta({
  layout: "store",
  name: "home",
});

// 使用商品列表 composable - 数据会在服务端自动预取
const { products, loading, hasMore, loadMore } = useProducts({
  pageSize: 5,
});
</script>
