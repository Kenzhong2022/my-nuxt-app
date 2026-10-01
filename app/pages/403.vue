<!-- 403 无权限页：permission.global.ts 权限守卫重定向的兜底落地页 -->
<template>
  <div class="forbidden-page">
    <el-result icon="warning" title="403" sub-title="抱歉，你没有访问该页面的权限">
      <template #extra>
        <el-button type="primary" @click="goHome">返回首页</el-button>
        <el-button @click="goBack">返回上一页</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});
// 无需登录态与权限校验（守卫对 /403 自身放行，防止重定向循环）

function goHome() {
  navigateTo('/', { replace: true });
}

function goBack() {
  // 无来路（如直接输 URL 进入）时回退首页
  if (window.history.length > 1) {
    useRouter().go(-1);
  } else {
    goHome();
  }
}
</script>

<style scoped>
.forbidden-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
</style>
