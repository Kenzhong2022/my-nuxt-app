<template>
  <div class="callback-page">
    <p>{{ tip }}</p>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
const route = useRoute();
const router = useRouter();
let tip = ref("处理登录凭证中...");

// 模拟后端交换token接口
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
  const code = route.query.code || "123456";
  const backPath = route.query.back || "/cart";

  if (!code) {
    tip.value = "无授权码code，登录失败";
    return;
  }

  try {
    // 换取长短token
    const tokenData = await fetchToken(code);
    localStorage.setItem("access_token", tokenData.access_token);
    localStorage.setItem("refresh_token", tokenData.refresh_token);
    tip.value = "登录成功，即将跳转原页面";
    // 跳回之前想去的购物车/订单页
    setTimeout(() => {
      router.push(backPath);
    }, 800);
  } catch (err) {
    tip.value = "换取token失败：" + err.message;
  }
});
</script>
