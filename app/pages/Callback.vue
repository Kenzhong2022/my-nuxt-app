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
    <el-button v-if="btnVisible" type="primary" @click="handleLogin">重新登录</el-button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';

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
    timestamp: '',
    size: 'large',
    idle: { content: '等待中...', type: 'info', icon: 'Clock' },
    pending: { content: '处理中...', type: 'primary', icon: 'Loading' },
    success: { content: '操作成功', type: 'success', icon: 'SuccessFilled' },
    error: { content: '操作失败', type: 'danger', icon: 'CircleCloseFilled' },
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
      this.setStatus('pending');
    },
    markSuccess() {
      this.setStatus('success');
    },
    markError() {
      this.setStatus('error');
    },
  };
}

// 预创建所有活动项，通过显式索引访问（避免原 curActivityIdx 越界 bug）
const activities = ref([
  createActivity({
    pending: { content: '尝试获取token...' },
    success: { content: '获取token成功' },
    error: { content: '获取token失败' },
  }),
  createActivity({
    pending: { content: '建立服务端会话...' },
    success: { content: '服务端会话已建立' },
    error: { content: '服务端会话建立失败' },
  }),
]);

const btnVisible = ref(false);

// ============================================
// 流程拆分：每步只负责一件事，并通过对应 timeline 项反馈状态
// ============================================

/** 解析重定向路径，缺失时兜底首页并提示 */
function resolveRedirectPath() {
  if (!route.query.redirect) {
    ElMessage.error('无重定向路径，将重定向到首页');
    return '/';
  }
  return route.query.redirect;
}

/** 校验授权码，缺失时返回 null */
function getCode() {
  if (!route.query.code) {
    ElMessage.error('缺少授权码，登录失败');
    return null;
  }
  return route.query.code;
}

/** 从地址栏摘除授权码（code 一次性消费，刷新页面重放必然 400），保留其余参数（如 redirect） */
function stripCodeFromUrl() {
  const query = { ...route.query };
  delete query.code;
  const search = new URLSearchParams(query).toString();
  // replaceState 不产生历史记录，避免回退又回到带旧 code 的地址
  window.history.replaceState(window.history.state, '', search ? `${route.path}?${search}` : route.path);
}

/** 用授权码换取 token，操作 timeline[0]（redirect_uri 走运行时配置，须与 authorize 发码时一致） */
async function redeemToken(code) {
  activities.value[0].activate();
  // 与发起授权时同一来源：配置优先，否则当前 origin 拼接 /CallBack
  const { getCallbackUrl } = useAuth();
  try {
    // client_secret 由服务端持有并提交认证中心；成功后服务端直接写 HttpOnly cookie
    const response = await $fetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        redirect_uri: getCallbackUrl(),
      }),
    });
    activities.value[0].markSuccess();
    return response;
  } catch (err) {
    activities.value[0].markError();
    throw err;
  }
}

/** 确认服务端会话建立（令牌已写入 HttpOnly cookie，前端不经手），操作 timeline[1] */
function confirmSession(response) {
  activities.value[1].activate();
  if (response?.code === 200) {
    activities.value[1].markSuccess();
    return true;
  }
  activities.value[1].markError();
  return false;
}

/** 主流程：校验参数 → 换 token → 确认会话 → 重新确认身份刷新菜单 → 跳转 */
async function handleCallback() {
  const backPath = resolveRedirectPath();
  const code = getCode();
  // 无论兑换成败立即摘除地址栏 code，防刷新/回退重放一次性授权码
  stripCodeFromUrl();
  if (!code) {
    router.push(backPath);
    return;
  }

  try {
    const tokenResponse = await redeemToken(code);
    // 服务端未确认会话建立（响应缺 code 200）则中止，
    // 绝不在无会话状态下执行 reloadIdentity（否则会以游客身份重拉，反而清空菜单）
    if (!confirmSession(tokenResponse)) {
      throw new Error('服务端会话建立失败，请重新登录');
    }
    // 登录成功后重新走一遍身份确认流程（app.vue 的 callOnce 不会二次执行）：
    // 重拉 getInfo + getRouters + 全量目录，刷新侧边栏菜单与权限后再跳转，
    // 避免旧（游客）菜单导致路由守卫把目标页判为无权限
    await reloadIdentity();
    ElMessage.success('登录成功');
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
