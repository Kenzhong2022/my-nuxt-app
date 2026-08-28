<template>
  <div class="callback-page">
    <el-timeline>
      <el-timeline-item
        v-for="(activity, index) in activities"
        :key="index"
        :timestamp="activity.timestamp"
        :icon="activity.icon"
        :type="activity.type"
        :size="activity.size"
        >{{ activity.content }}</el-timeline-item
      >
    </el-timeline>
    <el-button v-if="btnVisible" type="primary" @click="handleLogin"
      >重新登录</el-button
    >
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useAuthStore } from "~~/app/stores/auth";

definePageMeta({
  layout: false, // 不使用布局
});

const route = useRoute();
const router = useRouter();

// ============================================
// Activity 工厂：通过 config 覆盖默认值，未配置项使用统一默认
// 状态切换时同步更新 content/type/timestamp
// ============================================
function createActivity(config = {}) {
  const defaults = {
    timestamp: "",
    size: "large",
    idle: { content: "等待中...", type: "info", icon: "Clock" },
    pending: { content: "处理中...", type: "primary", icon: "Loading" },
    success: { content: "操作成功", type: "success", icon: "SuccessFilled" },
    error: { content: "操作失败", type: "danger", icon: "CircleCloseFilled" },
  };

  const states = {
    idle: { ...defaults.idle, ...config.idle },
    pending: { ...defaults.pending, ...config.pending },
    success: { ...defaults.success, ...config.success },
    error: { ...defaults.error, ...config.error },
  };

  return {
    timestamp: config.timestamp ?? defaults.timestamp,
    size: config.size ?? defaults.size,
    content: states.idle.content,
    type: states.idle.type,
    icon: states.idle.icon,
    _states: states,
    setStatus(status) {
      const s = this._states[status];
      this.content = s.content;
      this.type = s.type;
      this.icon = s.icon;
      this.timestamp = new Date().toLocaleString();
    },
    /** 从 idle 切到 pending，标记为当前进行中 */
    activate() {
      this.setStatus("pending");
    },
    markSuccess() {
      this.setStatus("success");
    },
    markError() {
      this.setStatus("error");
    },
  };
}

// 预创建所有活动项，通过显式索引访问（避免原 curActivityIdx 越界 bug）
const activities = ref([
  createActivity({
    pending: { content: "尝试获取token..." },
    success: { content: "获取token成功" },
    error: { content: "获取token失败" },
  }),
  createActivity({
    pending: { content: "token持久化..." },
    success: { content: "token已持久化" },
    error: { content: "token持久化失败" },
  }),
]);

const btnVisible = ref(false);

// ============================================
// 流程拆分：每步只负责一件事，并通过对应 timeline 项反馈状态
// ============================================

/** 解析重定向路径，缺失时兜底首页并提示 */
function resolveRedirectPath() {
  if (!route.query.redirect) {
    ElMessage.error("无重定向路径，将重定向到首页");
    return "/";
  }
  return route.query.redirect;
}

/** 校验授权码，缺失时返回 null */
function getCode() {
  if (!route.query.code) {
    ElMessage.error("缺少授权码，登录失败");
    return null;
  }
  return route.query.code;
}

/** 用授权码换取 token，操作 timeline[0]（redirect_uri 走运行时配置，须与 authorize 发码时一致） */
async function redeemToken(code) {
  activities.value[0].activate();
  const config = useRuntimeConfig();
  try {
    const response = await $fetch("/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: config.public.clientId,
        redirect_uri: config.public.callbackUrl,
      }),
    });
    activities.value[0].markSuccess();
    return response;
  } catch (err) {
    activities.value[0].markError();
    throw err;
  }
}

/** 持久化 token 到 Pinia store（写入 cookie，SSR/CSR 均可读），操作 timeline[1] */
function persistToken(tokenResponse) {
  activities.value[1].activate();
  // ✅ 使用 Pinia store 存储 token（useCookie 自动持久化）
  // 如果你还想存储 refresh_token，可以扩展 store 添加 refreshToken 字段
  const authStore = useAuthStore();
  const accessToken = tokenResponse?.access_token;
  if (!accessToken) {
    activities.value[1].markError();
    return false;
  }
  authStore.setToken(accessToken);
  if (authStore.token) {
    activities.value[1].markSuccess();
    return true;
  }
  activities.value[1].markError();
  return false;
}

/** 主流程：校验参数 → 换 token → 持久化 → 跳转 */
async function handleCallback() {
  const backPath = resolveRedirectPath();
  const code = getCode();
  if (!code) {
    router.push(backPath);
    return;
  }

  try {
    const tokenResponse = await redeemToken(code);
    persistToken(tokenResponse);
    ElMessage.success("登录成功");
    router.push(backPath);
  } catch (err) {
    btnVisible.value = true;
    ElMessage.error(err.message);
  }
}

/** 重新登录流程 */
async function handleLogin() {
  // 前往重定向路径，间接回到登录页
  router.push(resolveRedirectPath());
}

onMounted(handleCallback);
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
