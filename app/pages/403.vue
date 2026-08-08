<template>
  <div class="forbidden-page">
    <el-result
      icon="warning"
      title="403 无权限访问"
      sub-title="您没有权限访问该页面，请联系管理员申请权限。"
    >
      <template #extra>
        <el-button type="primary" @click="goBack">
          返回上一页
        </el-button>
        <el-button @click="goHome">
          回到首页
        </el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  // 403 页面独立展示，不套用后台布局
  layout: false,
})

const router = useRouter()

function goBack(): void {
  router.back()
}

function goHome(): void {
  router.push('/')
}
</script>

<style scoped>
.forbidden-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--el-bg-color-page);
}
</style>
