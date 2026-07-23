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
  console.log("开始处理登录凭证...");
  let code;
  let backPath = "";
  if (!route.query.redirect) {
    tip.value = "无重定向路径，登录失败";
    ElMessage.error("无重定向路径，登录失败，重定向到首页");
    backPath = "/";
    return;
  } else {
    backPath = route.query.redirect;
    ElMessage.success("登录成功");
  }
  if (!route.query.code) {
    tip.value = "无授权码code，登录失败";
  }
  code = route.query.code;

  try {
    // 换取长短token
    const tokenData = await fetchToken(code);
    localStorage.setItem("access_token", tokenData.access_token);
    localStorage.setItem("refresh_token", tokenData.refresh_token);
    tip.value = "成功获取token，即将跳转原页面";
    // 跳回之前想去的购物车/订单页
    router.push(backPath);
  } catch (err) {
    tip.value = "换取token失败：" + err.message;
  }
});
</script>
