<template>
  <div>
    <h1>扫码获取信息</h1>

    <!-- 方案A：使用 ClientOnly 包裹，确保只在浏览器端渲染 -->
    <ClientOnly>
      <div v-if="qrImageUrl" class="qrcode-wrapper">
        <img :src="qrImageUrl" alt="二维码" />
        <p class="tips">有效期 5 分钟，请尽快扫码</p>
      </div>
      <!-- 加载占位 -->
      <template #fallback>
        <div class="loading">正在生成二维码...</div>
      </template>
    </ClientOnly>

    <!-- 方案B：如果你不想用 ClientOnly，也可以用 v-if + 浏览器判断 -->
    <!-- <div v-if="isMounted && qrImageUrl"> ... </div> -->
  </div>
</template>

<script setup>
// 定义响应式数据
const qrImageUrl = ref("");
// 用于存储 ticket，方便轮询或后续操作（可选）
const ticket = ref("");

// 确保只在客户端执行
onMounted(async () => {
  // 仅在浏览器端动态加载 qrcode
  const QRCode = (await import("qrcode")).default;
  try {
    // 1. 获取用户登录后的临时票据（假设你对接了外部后端）
    const { data } = await $fetch("/api/qrcode/generate", {
      method: "GET",
      // 如果接口需要鉴权，携带 Cookie 或 Authorization header
      credentials: "include",
    });

    ticket.value = data.ticket;
    const content = data.qrContent;

    // 2. 在浏览器端生成 Base64 图片
    // 设置宽高 200，容错级别 M（15%）
    qrImageUrl.value = await QRCode.toDataURL(content, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: "H",
    });
  } catch (error) {
    console.error("生成二维码失败", error);
  }
});
</script>
