<template>
  <div class="callback-page">
    <p>{{ tip }}</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "~~/app/stores/auth"; // 导入 store

definePageMeta({
  layout: false, // 不使用布局
});

const route = useRoute();
const router = useRouter();
const tip = ref("处理登录凭证中...");

// 模拟后端交换 token 接口
const fetchToken = async (code) => {
  const res = await $fetch("/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      client_id: "business-a",
      redirect_uri: "http://localhost:3000/CallBack",
    }),
  });
  return res;
};

onMounted(async () => {
  console.log("开始处理登录凭证...");
  let code;
  let backPath = "";

  // 检查 redirect 参数
  if (!route.query.redirect) {
    tip.value = "无重定向路径，登录失败";
    ElMessage.error("无重定向路径，登录失败，重定向到首页");
    backPath = "/";
    // 这里直接跳转首页，但注意不要立即跳转，因为可能还有错误
    router.push("/");
    return;
  } else {
    backPath = route.query.redirect;
  }

  // 检查 code 参数
  if (!route.query.code) {
    tip.value = "无授权码code，登录失败";
    ElMessage.error("缺少授权码");
    router.push(backPath); // 跳转回原页面（但可能无法完成登录）
    return;
  }
  code = route.query.code;

  try {
    // 换取长短 token
    const tokenData = await fetchToken(code);

    // ✅ 使用 Pinia store 存储 token（自动持久化到 localStorage）
    const authStore = useAuthStore();
    authStore.setToken(tokenData.access_token);
    // 如果你还想存储 refresh_token，可以扩展 store 添加 refreshToken 字段
    // 但这里仅演示 access_token

    tip.value = "成功获取token，即将跳转原页面";
    ElMessage.success("登录成功");
    // 跳回之前想去的页面
    router.push(backPath);
  } catch (err) {
    tip.value = "换取token失败：" + err.message;
    ElMessage.error("登录失败，请重试");
    // 可选择性跳转回首页
    // router.push("/");
  }
});
</script>

<style scoped>
.callback-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  font-size: 18px;
  color: #333;
}
</style>
