<template>
  <div class="page-404">
    <div class="content">
      <h1 class="code">404</h1>
      <p class="desc">抱歉，你访问的页面不存在或暂无权限</p>
      <div class="actions">
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const router = useRouter();
const goHome = () => router.push('/dashboard');
const goBack = () => router.back();
</script>

<style lang="scss" scoped>
.page-404 {
  min-height: calc(100vh - 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
}
.content {
  text-align: center;
  .code {
    font-size: 120px;
    font-weight: 700;
    color: var(--el-color-primary);
    line-height: 1;
    margin: 0 0 24px;
  }
  .desc {
    font-size: 18px;
    color: var(--el-text-color-secondary);
    margin-bottom: 32px;
  }
  .actions {
    display: flex;
    gap: 16px;
    justify-content: center;
  }
}
</style>
