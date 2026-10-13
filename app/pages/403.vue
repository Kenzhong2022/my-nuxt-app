<!-- 403 无权限页：permission.global.ts 权限守卫重定向的兜底落地页 -->
<template>
  <div class="forbidden-page">
    <el-result icon="warning" title="403" sub-title="抱歉，你没有访问该页面的权限">
      <template #extra>
        <div class="forbidden-debug">
          <p class="forbidden-debug-line">
            被拦截页面：<code>{{ blockedPath }}</code>
          </p>
          <p class="forbidden-debug-line">
            当前角色：<code>{{ currentRoles }}</code>
          </p>
        </div>
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

// 诊断信息：被拦截的来源页 + 当前 store 身份（定位"登录后仍 403"类问题）
const userInfoStore = useUserInfoStore();

/** 来源页：权限守卫重定向前写入 useState（客户端导航拿不到 referrer，这是可靠来源） */
const blockedPath = ref('');
const currentRoles = ref('');

onMounted(() => {
  blockedPath.value = useState<string>('blocked-path', () => '').value || '(未记录)';
  currentRoles.value =
    userInfoStore.roles.join(', ') || '(空=身份未加载，仍是游客)';
  console.log('[403] 被拦截页面:', blockedPath.value, '| 当前角色:', currentRoles.value);
});

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
.forbidden-debug {
  margin-bottom: 12px;
  text-align: center;
}
.forbidden-debug-line {
  margin: 4px 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
.forbidden-debug-line code {
  color: var(--el-color-danger);
}
</style>
