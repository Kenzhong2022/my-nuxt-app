// middleware/auth.global.ts
import { useAuthStore } from '~~/app/stores/auth';
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

  // 3. SSR 阶段拿不到 localStorage 里的 token，跳过鉴权
  //    注意：这意味着受保护页面 SSR 会照常渲染，客户端再补判
  if (import.meta.server) return;

  const authStore = useAuthStore();
  if (!authStore.token) {
    console.log('未登录，跳转到登录页', to.fullPath);
    const { requireLogin } = useAuth();
    requireLogin(to.fullPath);
    // 若 requireLogin 内部没 await navigateTo，这里补一个中止
    return;
  }

  ElMessage.success('经过鉴权，您有权限访问该页面');
});
