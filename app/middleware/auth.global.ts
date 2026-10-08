// middleware/auth.global.ts
// 如果没有用 @element-plus/nuxt 自动导入，需要手动引入：
// import { ElMessage } from 'element-plus';

export default defineNuxtRouteMiddleware((to) => {
  // 1. 首页重定向：必须 return navigateTo，直接改 to.path 不会跳转
  //    放在 SSR 判断之前，让服务端首屏就完成跳转，避免闪烁
  if (to.path === '/') {
    return navigateTo('/dashboard', { redirectCode: 301 });
  }

  // 2. 未声明权限要求的页面，默认公开
  const required = to.meta.requiredPermission;
  const requiredAny = to.meta.requiredPermissionAny;
  if (!required && !requiredAny) return;

  // 3. SSR 阶段跳过（app.vue callOnce 的身份数据会随 payload 水合，客户端再补判）
  if (import.meta.server) return;

  // 4. 登录态以身份为准（getInfo 服务端验证结果），不再是本地 cookie 有无的猜测
  const { isLoggedIn, login } = useAuth();
  if (!isLoggedIn.value) {
    console.log('未登录，跳转到登录页', to.fullPath);
    // 未登录直接跳认证中心（带登录成功后的回跳路径），无需确认弹窗
    login(to.fullPath);
    return false;
  }

  ElMessage.success('经过鉴权，您有权限访问该页面');
});
